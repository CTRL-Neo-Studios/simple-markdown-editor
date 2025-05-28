import { Decoration, ViewPlugin, type PluginValue } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';

// Node names from @codemirror/lang-markdown's Lezer grammar
// You might need to inspect the syntax tree to find the exact names for all cases.
// Common ones:
// "ATXHeading1", "ATXHeading2", etc.
// "HeaderMark" (for #, ##)
// "Emphasis" (for *em* or _em_)
// "EmphasisMark" (for * or _)
// "StrongEmphasis" (for **strong** or __strong__)
// "Strikethrough"
// "StrikethroughMark"
// "InlineCode"
// "CodeMark" (for `)
// "FencedCode"
// "CodeInfo" (language name in fenced code)
// "Link"
// "LinkMark" (for [ and ])
// "URL"
// "Image"
// "ListItem"
// "ListMark" (for *, -, +)
// "QuoteMark" (for >)
// "HardBreak" (for <br>) - often not hidden

const syntaxTokensToHide = [
    'HeaderMark',
    'ListMark',     // For list markers like *, -, +
    'QuoteMark',    // For > in blockquotes
    'EmphasisMark', // For * or _ in italics/bold
    'CodeMark',     // For ` in inline code
    'StrikethroughMark',
    // 'LinkMark', // Often you want to see [ and ] unless fully rendering links
    // 'URL', // Usually styled, not hidden, when part of a link
    // 'CodeInfo', // Language in fenced code block. Obsidian shows it.
];

// Elements where if the cursor is inside, we don't hide their marks
const cursorSensitiveParents = [
    'ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6',
    'Emphasis',
    'StrongEmphasis',
    'Strikethrough',
    'InlineCode',
    'Link',
    'ListItem', // Important for list markers
    'Blockquote'  // Important for quote markers
];

const hiddenMarkDecoration = Decoration.mark({ class: 'cm-syntax-hidden' });

class ObsidianRichEditPluginValue implements PluginValue {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.computeDecorations(update.view);
        }
    }

    computeDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = [];
        const { state } = view;
        const [selection] = state.selection.ranges; // Primary selection

        for (const { from, to } of view.visibleRanges) {
            syntaxTree(state).iterate({
                from,
                to,
                enter: (node) => {
                    // Check if cursor is inside a "sensitive" parent node
                    // If so, we don't hide child marks of that specific instance of the parent
                    let cursorInsideParent = false;
                    if (cursorSensitiveParents.includes(node.name)) {
                        if (selection.from >= node.from && selection.to <= node.to) {
                            cursorInsideParent = true;
                        }
                    }

                    // Check if cursor is directly on the mark itself for finer control
                    // This is useful if the parent check isn't enough
                    const cursorOnMark = selection.from === node.from || (selection.from > node.from && selection.from < node.to);


                    if (syntaxTokensToHide.includes(node.name)) {
                        // Logic: Hide if...
                        // 1. The cursor is NOT within a "sensitive" parent that this mark belongs to.
                        // OR if it IS in a sensitive parent, but the cursor is NOT directly at the mark itself.
                        // This allows seeing marks when editing, but hides them otherwise.

                        let hide = true;

                        // Iterate upwards to find if this mark is part of a sensitive parent
                        // and if the cursor is within that parent.
                        let parentNode = node.node.parent;
                        let isDescendantOfSensitiveParentWithCursor = false;
                        while(parentNode) {
                            if (cursorSensitiveParents.includes(parentNode.name)) {
                                if (selection.from >= parentNode.from && selection.to <= parentNode.to) {
                                    isDescendantOfSensitiveParentWithCursor = true;
                                    break;
                                }
                            }
                            if (parentNode.name === "Document") break; // Stop at document root
                            parentNode = parentNode.parent;
                        }

                        if (isDescendantOfSensitiveParentWithCursor) {
                            // If cursor is in a sensitive parent, only hide if cursor is NOT on/near the mark
                            // Allow a small buffer for selection. For example, for ##_Heading, cursor at _ means 1 char after mark.
                            const buffer = 1; // For space after #, etc.
                            if (selection.from > node.from - buffer && selection.to < node.to + buffer) {
                                hide = false;
                            }
                        }

                        // Special handling For HeaderMark: always hide the space after it too if it exists
                        if (node.name === 'HeaderMark' && hide) {
                            const markText = state.doc.sliceString(node.from, node.to);
                            const nextChar = state.doc.sliceString(node.to, node.to + 1);
                            if (nextChar === ' ') {
                                widgets.push(hiddenMarkDecoration.range(node.from, node.to + 1));
                            } else {
                                widgets.push(hiddenMarkDecoration.range(node.from, node.to));
                            }
                        } else if (hide) {
                            widgets.push(hiddenMarkDecoration.range(node.from, node.to));
                        }
                    }
                },
            });
        }
        return Decoration.set(widgets, true);
    }
}

export const obsidianRichEditPlugin = ViewPlugin.fromClass(ObsidianRichEditPluginValue, {
    decorations: v => v.decorations,
});