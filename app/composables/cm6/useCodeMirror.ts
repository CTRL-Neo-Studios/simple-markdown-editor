import { ref, shallowRef } from 'vue'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, Decoration, ViewPlugin, WidgetType } from '@codemirror/view'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { DecorationSet, ViewUpdate, PluginValue } from '@codemirror/view'
import type { Range } from '@codemirror/state'

// Obsidian-specific syntax elements to hide/show
const obsidianTokensToHide = [
    'LinkMark',           // [[ and ]]
    'EmphasisMark',       // * and **
    'CodeMark',           // `
    'URL',                // URLs in links
    'HeaderMark',         // # symbols
    'HardBreak',          // line breaks
]

const obsidianTokensToStyle = [
    'InlineCode',         // `code`
    'Emphasis',           // *italic*
    'StrongEmphasis',     // **bold**
    'FencedCode',         // ```code blocks```
    'Link',               // [text](url)
    'Image',              // ![alt](src)
]

// Custom highlight style for Obsidian theme
const obsidianHighlightStyle = HighlightStyle.define([
    { tag: t.heading1, fontWeight: '700', fontSize: '2rem', color: 'var(--text-accent)', marginBottom: '0.5rem' },
    { tag: t.heading2, fontWeight: '600', fontSize: '1.75rem', color: 'var(--text-accent)', marginBottom: '0.4rem' },
    { tag: t.heading3, fontWeight: '600', fontSize: '1.5rem', color: 'var(--text-accent)', marginBottom: '0.3rem' },
    { tag: t.heading4, fontWeight: '600', fontSize: '1.25rem', color: 'var(--text-accent)' },
    { tag: t.heading5, fontWeight: '600', fontSize: '1.125rem', color: 'var(--text-accent)' },
    { tag: t.heading6, fontWeight: '600', fontSize: '1rem', color: 'var(--text-accent)' },
    { tag: t.emphasis, fontStyle: 'italic', color: 'var(--text-normal)' },
    { tag: t.strong, fontWeight: '600', color: 'var(--text-normal)' },
    { tag: t.monospace, fontFamily: 'var(--font-monospace)', backgroundColor: 'var(--background-modifier-border)', padding: '2px 4px', borderRadius: '3px' },
    { tag: t.link, color: 'var(--text-accent)', textDecoration: 'none', cursor: 'pointer' },
    { tag: t.content, color: 'var(--text-normal)' },
    { tag: t.meta, color: 'var(--text-muted)' },
])

// Widget for rendering Obsidian internal links
class ObsidianLinkWidget extends WidgetType {
    constructor(public text: string, public linkText: string) {
        super()
    }

    override eq(other: ObsidianLinkWidget): boolean {
        return other.text === this.text
    }

    toDOM(): HTMLElement {
        const link = document.createElement('span')
        link.className = 'obsidian-internal-link'
        link.textContent = this.linkText
        link.style.cssText = `
      color: var(--text-accent);
      text-decoration: underline;
      cursor: pointer;
      background: var(--background-modifier-border);
      padding: 2px 4px;
      border-radius: 3px;
    `
        return link
    }

    override ignoreEvent(): boolean {
        return false
    }
}

// Widget for rendering highlights
class ObsidianHighlightWidget extends WidgetType {
    constructor(public text: string) {
        super()
    }

    override eq(other: ObsidianHighlightWidget): boolean {
        return other.text === this.text
    }

    toDOM(): HTMLElement {
        const highlight = document.createElement('mark')
        highlight.className = 'obsidian-highlight'
        highlight.textContent = this.text
        highlight.style.cssText = `
      background: var(--text-highlight-bg);
      color: var(--text-normal);
      padding: 0 2px;
    `
        return highlight
    }
}

// Main WYSIWYG plugin
class ObsidianWysiwygPlugin implements PluginValue {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.buildDecorations(update.view)
        }
    }

    buildDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = []
        const [cursor] = view.state.selection.ranges

        for (const { from, to } of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from,
                to,
                enter: (node) => {
                    const nodeText = view.state.doc.sliceString(node.from, node.to)

                    // Handle Obsidian internal links [[link]]
                    if (nodeText.match(/^\[\[.*\]\]$/)) {
                        if (cursor.from < node.from || cursor.to > node.to) {
                            const linkText = nodeText.slice(2, -2) // Remove [[ ]]
                            widgets.push(
                                Decoration.replace({
                                    widget: new ObsidianLinkWidget(nodeText, linkText),
                                }).range(node.from, node.to)
                            )
                        }
                        return false
                    }

                    // Handle Obsidian highlights ==text==
                    if (nodeText.match(/^==.*==$/)) {
                        if (cursor.from < node.from || cursor.to > node.to) {
                            const highlightText = nodeText.slice(2, -2) // Remove == ==
                            widgets.push(
                                Decoration.replace({
                                    widget: new ObsidianHighlightWidget(highlightText),
                                }).range(node.from, node.to)
                            )
                        }
                        return false
                    }

                    // Hide syntax markers when not editing
                    if (obsidianTokensToHide.includes(node.name)) {
                        if (cursor.from !== node.from && cursor.from !== node.from + 1) {
                            widgets.push(
                                Decoration.mark({ class: 'cm-obsidian-hidden' }).range(node.from, node.to)
                            )
                        }
                    }

                    // Handle styled elements - don't hide when cursor is inside
                    if (obsidianTokensToStyle.includes(node.name)) {
                        if (cursor.from >= node.from && cursor.to <= node.to) {
                            return false // Don't hide when editing
                        }
                    }

                    // Handle header marks
                    if (node.name === 'HeaderMark') {
                        if (cursor.from < node.from || cursor.to > node.to + 1) {
                            widgets.push(
                                Decoration.mark({ class: 'cm-obsidian-hidden' }).range(node.from, node.to + 1)
                            )
                        }
                    }

                    // Handle list bullets
                    if (node.name === 'ListMark' && node.matchContext(['BulletList', 'ListItem'])) {
                        if (cursor.from !== node.from && cursor.from !== node.from + 1) {
                            widgets.push(
                                Decoration.mark({ class: 'cm-obsidian-bullet' }).range(node.from, node.to)
                            )
                        }
                    }
                }
            })
        }

        return Decoration.set(widgets)
    }
}

// Create the Obsidian extension
function createObsidianExtension(): Extension {
    return [
        ViewPlugin.fromClass(ObsidianWysiwygPlugin, {
            decorations: v => v.decorations,
            provide: () => [
                syntaxHighlighting(obsidianHighlightStyle),
                markdown({
                    codeLanguages: [], // Add language support as needed
                })
            ],
            eventHandlers: {
                mousedown(event, view) {
                    const target = event.target as Element
                    if (target.matches('.obsidian-internal-link')) {
                        // Handle internal link clicks
                        const linkText = target.textContent
                        console.log('Navigate to:', linkText)
                        // Implement your navigation logic here
                    }
                }
            }
        })
    ]
}

export function useCodeMirror() {
    const view = shallowRef<EditorView>()
    const content = ref('')

    const extensions = [
        createObsidianExtension(),
        EditorView.lineWrapping,
        EditorView.theme({
            '.cm-obsidian-hidden': {
                display: 'none'
            },
            '.cm-obsidian-bullet': {
                color: 'var(--text-accent)',
                fontWeight: 'bold'
            },
            '.cm-editor': {
                fontFamily: 'var(--font-sans)',
                fontSize: '16px',
                lineHeight: '1.6'
            },
            '.cm-content': {
                padding: '20px',
                minHeight: '100vh'
            }
        })
    ]

    return {
        view,
        content,
        extensions
    }
}