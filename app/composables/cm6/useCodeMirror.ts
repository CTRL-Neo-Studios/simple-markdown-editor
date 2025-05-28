// composables/cm6/useCodeMirror.ts
import { ref, shallowRef, computed } from 'vue'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, ViewPlugin, Decoration, WidgetType } from '@codemirror/view'
import { syntaxHighlighting, HighlightStyle, syntaxTree } from '@codemirror/language'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { tags as t } from '@lezer/highlight'
import type { DecorationSet, ViewUpdate, PluginValue } from '@codemirror/view'
import type { Range } from '@codemirror/state'
import type { MarkdownConfig } from '@lezer/markdown'

// Define Obsidian-specific markdown extensions
const obsidianMarkdownConfig: MarkdownConfig = {
    defineNodes: [
        { name: 'WikiLink', style: t.link },
        { name: 'WikiLinkMark', style: t.processingInstruction },
        { name: 'WikiLinkText', style: t.link },
        { name: 'EmbedLink', style: t.link },
        { name: 'BlockReference', style: t.link },
        { name: 'BlockID', style: t.labelName },
        { name: 'Footnote', style: t.typeName },
        { name: 'FootnoteMark', style: t.processingInstruction },
        { name: 'Comment', style: t.comment, block: true },
        { name: 'CommentMark', style: t.processingInstruction },
        { name: 'Highlight', style: t.annotation },
        { name: 'HighlightMark', style: t.processingInstruction },
        { name: 'Callout', style: t.keyword, block: true },
    ],
    parseInline: [
        // Wiki links: [[Link]] or [[Link|Alias]] or [[Link#Header]] or [[Link#Header|Alias]]
        {
            name: 'WikiLink',
            parse(cx, next, pos) {
                if (next !== 91 /* [ */ || cx.char(pos + 1) !== 91) return -1

                let end = pos + 2
                let foundEnd = false
                while (end < cx.end) {
                    if (cx.char(end) === 93 /* ] */ && cx.char(end + 1) === 93) {
                        foundEnd = true
                        break
                    }
                    end++
                }

                if (!foundEnd) return -1

                const wikiLink = cx.elt('WikiLink', pos, end + 2)
                cx.addElement(cx.elt('WikiLinkMark', pos, pos + 2, [wikiLink]))
                cx.addElement(cx.elt('WikiLinkText', pos + 2, end, [wikiLink]))
                cx.addElement(cx.elt('WikiLinkMark', end, end + 2, [wikiLink]))
                return cx.addElement(wikiLink)
            }
        },
        // Embed links: ![[Link]]
        {
            name: 'EmbedLink',
            parse(cx, next, pos) {
                if (next !== 33 /* ! */ || cx.char(pos + 1) !== 91 || cx.char(pos + 2) !== 91) return -1

                let end = pos + 3
                let foundEnd = false
                while (end < cx.end - 1) {
                    if (cx.char(end) === 93 && cx.char(end + 1) === 93) {
                        foundEnd = true
                        break
                    }
                    end++
                }

                if (!foundEnd) return -1
                return cx.addElement(cx.elt('EmbedLink', pos, end + 2))
            }
        },
        // Block reference: ^id
        {
            name: 'BlockID',
            parse(cx, next, pos) {
                if (next !== 94 /* ^ */) return -1

                let end = pos + 1
                while (end < cx.end && /[a-zA-Z0-9_-]/.test(String.fromCharCode(cx.char(end)))) {
                    end++
                }

                if (end === pos + 1) return -1
                return cx.addElement(cx.elt('BlockID', pos, end))
            }
        },
        // Footnotes: [^id]
        {
            name: 'Footnote',
            parse(cx, next, pos) {
                if (next !== 91 /* [ */ || cx.char(pos + 1) !== 94 /* ^ */) return -1

                let end = pos + 2
                while (end < cx.end && cx.char(end) !== 93 /* ] */) {
                    end++
                }

                if (cx.char(end) !== 93) return -1

                const footnote = cx.elt('Footnote', pos, end + 1)
                cx.addElement(cx.elt('FootnoteMark', pos, pos + 2, [footnote]))
                cx.addElement(cx.elt('FootnoteMark', end, end + 1, [footnote]))
                return cx.addElement(footnote)
            }
        },
        // Comments: %%Text%%
        {
            name: 'Comment',
            parse(cx, next, pos) {
                if (next !== 37 /* % */ || cx.char(pos + 1) !== 37) return -1

                let end = pos + 2
                let foundEnd = false
                while (end < cx.end - 1) {
                    if (cx.char(end) === 37 && cx.char(end + 1) === 37) {
                        foundEnd = true
                        break
                    }
                    end++
                }

                if (!foundEnd) return -1

                const comment = cx.elt('Comment', pos, end + 2)
                cx.addElement(cx.elt('CommentMark', pos, pos + 2, [comment]))
                cx.addElement(cx.elt('CommentMark', end, end + 2, [comment]))
                return cx.addElement(comment)
            }
        },
        // Highlights: ==Text==
        {
            name: 'Highlight',
            parse(cx, next, pos) {
                if (next !== 61 /* = */ || cx.char(pos + 1) !== 61) return -1

                let end = pos + 2
                let foundEnd = false
                while (end < cx.end - 1) {
                    if (cx.char(end) === 61 && cx.char(end + 1) === 61) {
                        foundEnd = true
                        break
                    }
                    end++
                }

                if (!foundEnd) return -1

                const highlight = cx.elt('Highlight', pos, end + 2)
                cx.addElement(cx.elt('HighlightMark', pos, pos + 2, [highlight]))
                cx.addElement(cx.elt('HighlightMark', end, end + 2, [highlight]))
                return cx.addElement(highlight)
            }
        }
    ],
    parseBlock: [
        // Callouts: > [!note]
        {
            name: 'Callout',
            parse(cx, line) {
                const match = /^>\s*\[!([\w-]+)\]/.exec(line.text)
                if (!match) return false

                const callout = cx.elt('Callout', cx.lineStart, cx.lineStart + match[0].length)
                cx.addElement(callout)
                cx.nextLine()
                return true
            }
        }
    ]
}

// Obsidian-inspired highlight styles
const obsidianHighlightStyle = HighlightStyle.define([
    { tag: t.heading1, class: 'cm-header cm-header-1' },
    { tag: t.heading2, class: 'cm-header cm-header-2' },
    { tag: t.heading3, class: 'cm-header cm-header-3' },
    { tag: t.heading4, class: 'cm-header cm-header-4' },
    { tag: t.heading5, class: 'cm-header cm-header-5' },
    { tag: t.heading6, class: 'cm-header cm-header-6' },
    { tag: t.emphasis, class: 'cm-em' },
    { tag: t.strong, class: 'cm-strong' },
    { tag: t.strikethrough, class: 'cm-strikethrough' },
    { tag: t.link, class: 'cm-link' },
    { tag: t.monospace, class: 'cm-inline-code' },
    { tag: t.content, class: 'cm-content' },
    { tag: t.meta, class: 'cm-meta' },
    { tag: t.comment, class: 'cm-comment' },
    { tag: t.annotation, class: 'cm-highlight-text' },
    { tag: t.processingInstruction, class: 'cm-formatting-mark' },
])

// Token types that should be hidden when not focused
const hiddenTokens = [
    'LinkMark',
    'EmphasisMark',
    'CodeMark',
    'HeaderMark',
    'CommentMark',
    'HighlightMark',
    'WikiLinkMark',
    'FootnoteMark',
    'URL',
]

// Token types that should trigger rich rendering
const richTokens = [
    'FencedCode',
    'Table',
    'Blockquote',
    'EmbedLink',
]

// Widget for rendering embeds
class EmbedWidget extends WidgetType {
    constructor(public content: string) {
        super()
    }

    eq(other: EmbedWidget): boolean {
        return other.content === this.content
    }

    toDOM(): HTMLElement {
        const div = document.createElement('div')
        div.className = 'cm-embed-block'
        div.setAttribute('contenteditable', 'false')

        // Extract the link from ![[Link]]
        const link = this.content.slice(3, -2)
        div.innerHTML = `<div class="cm-embed-content">📄 ${link}</div>`

        return div
    }

    ignoreEvent(): boolean {
        return false
    }
}

// Widget for rendering code blocks
class CodeBlockWidget extends WidgetType {
    constructor(public code: string, public language: string = '') {
        super()
    }

    eq(other: CodeBlockWidget): boolean {
        return other.code === this.code && other.language === this.language
    }

    toDOM(): HTMLElement {
        const pre = document.createElement('pre')
        pre.className = 'cm-codeblock'
        pre.setAttribute('contenteditable', 'false')

        const code = document.createElement('code')
        if (this.language) {
            code.className = `language-${this.language}`
        }
        code.textContent = this.code
        pre.appendChild(code)

        return pre
    }

    ignoreEvent(): boolean {
        return false
    }
}

// Main WYSIWYG plugin
class ObsidianWYSIWYGPlugin implements PluginValue {
    decorations: DecorationSet

    constructor(public view: EditorView) {
        this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.buildDecorations(update.view)
        }
    }

    buildDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = []
        const [selection] = view.state.selection.ranges

        for (const { from, to } of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from,
                to,
                enter(node) {
                    const cursorInside = selection.from >= node.from && selection.to <= node.to

                    // Hide formatting marks when cursor is not inside
                    if (hiddenTokens.includes(node.name) && !cursorInside) {
                        widgets.push(
                            Decoration.mark({ class: 'cm-hidden' }).range(node.from, node.to)
                        )
                    }

                    // Special handling for headers - hide marks only when not editing the line
                    if (node.name === 'HeaderMark') {
                        const line = view.state.doc.lineAt(node.from)
                        const cursorInLine = selection.from >= line.from && selection.to <= line.to
                        if (!cursorInLine) {
                            widgets.push(
                                Decoration.mark({ class: 'cm-hidden' }).range(node.from, node.to + 1)
                            )
                        }
                    }

                    // Hide emphasis/strong marks when not editing
                    if ((node.name === 'Emphasis' || node.name === 'StrongEmphasis') && !cursorInside) {
                        // Iterate through children to find EmphasisMark nodes
                        syntaxTree(view.state).iterate({
                            from: node.from,
                            to: node.to,
                            enter(child) {
                                if (child.name === 'EmphasisMark') {
                                    widgets.push(
                                        Decoration.mark({ class: 'cm-hidden' }).range(child.from, child.to)
                                    )
                                }
                            }
                        })
                        return false // Don't descend into children
                    }

                    // Hide inline code marks when not editing
                    if (node.name === 'InlineCode' && !cursorInside) {
                        syntaxTree(view.state).iterate({
                            from: node.from,
                            to: node.to,
                            enter(child) {
                                if (child.name === 'CodeMark') {
                                    widgets.push(
                                        Decoration.mark({ class: 'cm-hidden' }).range(child.from, child.to)
                                    )
                                }
                            }
                        })
                        return false
                    }

                    // Replace embed links with widgets
                    if (node.name === 'EmbedLink' && !cursorInside) {
                        const text = view.state.doc.sliceString(node.from, node.to)
                        widgets.push(
                            Decoration.replace({
                                widget: new EmbedWidget(text),
                                block: true,
                            }).range(node.from, node.to)
                        )
                    }

                    // Replace fenced code blocks with widgets
                    if (node.name === 'FencedCode' && !cursorInside) {
                        let language = ''
                        let codeContent = ''

                        syntaxTree(view.state).iterate({
                            from: node.from,
                            to: node.to,
                            enter(child) {
                                if (child.name === 'CodeInfo') {
                                    language = view.state.doc.sliceString(child.from, child.to).trim()
                                } else if (child.name === 'CodeText') {
                                    codeContent = view.state.doc.sliceString(child.from, child.to)
                                }
                            }
                        })

                        if (!codeContent) {
                            codeContent = view.state.doc.sliceString(node.from, node.to)
                                .replace(/^```\w*\n/, '')
                                .replace(/\n```$/, '')
                        }

                        widgets.push(
                            Decoration.replace({
                                widget: new CodeBlockWidget(codeContent, language),
                                block: true,
                            }).range(node.from, node.to)
                        )
                    }

                    // Hide comments completely when not editing
                    if (node.name === 'Comment' && !cursorInside) {
                        widgets.push(
                            Decoration.mark({ class: 'cm-hidden' }).range(node.from, node.to)
                        )
                    }
                }
            })
        }

        return Decoration.set(widgets)
    }
}

// Create the complete extension
export function createObsidianExtension(): Extension {
    return [
        markdown({
            base: markdownLanguage,
            codeLanguages: [], // Add language support as needed
            extensions: [obsidianMarkdownConfig]
        }),
        syntaxHighlighting(obsidianHighlightStyle),
        ViewPlugin.fromClass(ObsidianWYSIWYGPlugin, {
            decorations: v => v.decorations,
            eventHandlers: {
                mousedown(event, view) {
                    const target = event.target as HTMLElement

                    // Handle clicks on rendered blocks
                    if (target.closest('.cm-embed-block, .cm-codeblock')) {
                        const pos = view.posAtDOM(target)
                        view.dispatch({ selection: { anchor: pos } })
                    }
                }
            }
        }),
        EditorView.theme({
            '&': {
                fontSize: '16px',
                fontFamily: 'var(--font-text)',
            },
            '.cm-content': {
                padding: '20px 40px',
                lineHeight: '1.6',
                fontFamily: 'inherit',
            },
            '.cm-line': {
                padding: '2px 0',
            },

            // Hidden formatting marks
            '.cm-hidden': {
                display: 'none !important',
            },

            // Headers
            '.cm-header': {
                fontWeight: 'bold',
                fontFamily: 'var(--font-text)',
                lineHeight: '1.3',
                marginTop: '0.5em',
                marginBottom: '0.25em',
                display: 'block',
            },
            '.cm-header-1': { fontSize: '2em', color: 'var(--text-accent)' },
            '.cm-header-2': { fontSize: '1.75em', color: 'var(--text-accent)' },
            '.cm-header-3': { fontSize: '1.5em', color: 'var(--text-accent)' },
            '.cm-header-4': { fontSize: '1.25em', color: 'var(--text-accent)' },
            '.cm-header-5': { fontSize: '1.125em', color: 'var(--text-accent)' },
            '.cm-header-6': { fontSize: '1em', color: 'var(--text-accent)' },

            // Text formatting
            '.cm-em': { fontStyle: 'italic' },
            '.cm-strong': { fontWeight: 'bold' },
            '.cm-strikethrough': { textDecoration: 'line-through' },

            // Links
            '.cm-link': {
                color: 'var(--text-accent)',
                textDecoration: 'underline',
                cursor: 'pointer',
            },

            // Inline code
            '.cm-inline-code': {
                fontFamily: 'var(--font-monospace)',
                backgroundColor: 'var(--background-secondary)',
                padding: '2px 4px',
                borderRadius: '3px',
                fontSize: '0.9em',
            },

            // Highlights
            '.cm-highlight-text': {
                backgroundColor: 'var(--text-highlight-bg)',
                padding: '0 2px',
                borderRadius: '2px',
            },

            // Embeds
            '.cm-embed-block': {
                margin: '10px 0',
                padding: '12px',
                backgroundColor: 'var(--background-secondary)',
                border: '1px solid var(--background-modifier-border)',
                borderRadius: '4px',
            },
            '.cm-embed-content': {
                color: 'var(--text-muted)',
            },

            // Code blocks
            '.cm-codeblock': {
                margin: '10px 0',
                padding: '12px',
                backgroundColor: 'var(--background-secondary)',
                borderRadius: '4px',
                overflow: 'auto',
                fontFamily: 'var(--font-monospace)',
                fontSize: '0.9em',
                lineHeight: '1.4',
            },

            // Selection
            '.cm-selectionBackground': {
                backgroundColor: 'var(--text-selection) !important',
            },
            '.cm-cursor': {
                borderLeftColor: 'var(--text-normal)',
            },

            // Line highlighting
            '.cm-activeLine': {
                backgroundColor: 'transparent',
            },
            '.cm-activeLineGutter': {
                backgroundColor: 'var(--background-secondary)',
            },
        }),
        EditorView.lineWrapping,
    ]
}

export function useCodeMirror() {
    const view = shallowRef<EditorView>()
    const content = ref('')
    const extensions = createObsidianExtension()

    return {
        view,
        content,
        extensions,
    }
}