import { Decoration, EditorView, type PluginValue } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';

// Existing hidden decoration if needed for other things,
// but for marks we'll use replace.
// const decorationHidden = Decoration.mark({ class: 'cm-markdoc-hidden' }); [10]

// Tokens for inline formatting marks whose visibility depends on parent node's active state
const toggleableMarkTokens = [
    'HeaderMark',      // For #, ## etc.
    'QuoteMark',       // For > in blockquotes (already handled, but fits pattern)
    'EmphasisMark',    // For * and _ in Emphasis, and ** and __ in StrongEmphasis
    'StrikethroughMark',// For ~~
    'TaskMarker',      // For [ ], [x]
    // 'LinkMark' and 'URL' might be more complex if you want to show a rich link widget
];

// Tokens that are *always* hidden (or replaced), like CodeInfo in FencedCode
const alwaysHiddenTokens = [
    'CodeInfo', // Usually good to hide the language string like 'js'
    // 'LinkSpecificURL', // If you have a Markdoc extension or custom parsing for URLs you always want to hide.
];


export default class RichEditPlugin implements PluginValue {
    public decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = [];
        const { state } = view;
        const cursor = state.selection.main;

        // Helper to determine if a node (from-to range) is "active"
        // Active if cursor is within its bounds (empty selection),
        // OR if part of a multi-character selection intersects it.
        const isNodeRangeActive = (nodeFrom: number, nodeTo: number): boolean => {
            if (cursor.empty) { // Single cursor position
                // Active if cursor is anywhere from the start of the opening mark
                // to the end of the closing mark.
                return cursor.from >= nodeFrom && cursor.from <= nodeTo;
            } else { // Range selection
                // Active if the selection range overlaps with the node's range.
                return Math.max(nodeFrom, cursor.from) < Math.min(nodeTo, cursor.to);
            }
        };

        for (const { from, to } of view.visibleRanges) {
            syntaxTree(state).iterate({
                from,
                to,
                enter: (node) => {
                    const nodeName = node.name;
                    const nodeFrom = node.from;
                    const nodeTo = node.to;

                    // 1. Handle always hidden tokens
                    if (alwaysHiddenTokens.includes(nodeName)) {
                        widgets.push(Decoration.replace({}).range(nodeFrom, nodeTo));
                        return; // Done with this node
                    }

                    // 2. Handle toggleable marks based on parent's active state
                    if (toggleableMarkTokens.includes(nodeName)) {
                        const parentNode = node.node.parent;
                        if (parentNode) {
                            // Determine the full range of the parent formatting node
                            // (e.g., for EmphasisMark, parentNode is Emphasis/StrongEmphasis)
                            const parentFrom = parentNode.from;
                            const parentTo = parentNode.to;

                            if (!isNodeRangeActive(parentFrom, parentTo)) {
                                // Parent is INACTIVE: replace the mark with "nothing"
                                // For HeaderMark, also hide the space after it if it's '# '
                                let markEnd = nodeTo;
                                if (nodeName === 'HeaderMark' && state.doc.sliceString(nodeTo -1, nodeTo) === ' '){
                                    // This is a bit simplistic, assumes space is part of HeaderMark or immediately after.
                                    // Lezer GFM often includes the space in HeaderMark.
                                }
                                widgets.push(Decoration.replace({}).range(nodeFrom, markEnd));
                            } else {
                                // Parent is ACTIVE: do nothing, let the mark be visible
                                // and styled by the syntaxHighlighting theme.
                                // Obsidian's active header DOM suggests this:
                                // <span class="cm-formatting cm-formatting-header...">#&nbsp;</span>
                                // This is just a styled span, not a widget.
                            }
                        }
                        return; // Done with this mark node
                    }

                    // 3. Existing logic for other things (like FencedCode, MarkdocTag, ListMark)
                    // These might already use widgets or specific line styles like your codeBlockStylePlugin [1].
                    // Ensure this logic doesn't conflict.

                    if (nodeName === 'MarkdocTag') { // [10]
                        widgets.push(Decoration.mark({ class: 'cm-markdoc-tag' }).range(nodeFrom, nodeTo)); // [12]
                    }

                    if (nodeName === 'FencedCode') { // [10]
                        // This is likely handled by codeBlockStylePlugin
                        // widgets.push(Decoration.mark({ class: 'cm-markdoc-code' }).range(nodeFrom, nodeTo)); [12]
                        return false; // Don't iterate into FencedCode if handled by another plugin
                    }

                    if (nodeName === 'ListMark' && node.node.matchContext(['BulletList', 'ListItem'])) { // [10]
                        // If cursor is not on the line of the ListMark, hide it and show bullet widget
                        const lineOfMark = view.state.doc.lineAt(nodeFrom);
                        const lineOfCursor = view.state.doc.lineAt(cursor.from);
                        if (lineOfMark.number !== lineOfCursor.number) {
                            widgets.push(Decoration.mark({ class: 'cm-markdoc-bullet' }).range(nodeFrom, nodeTo)); // [12]
                        }
                    }

                },
            });
        }
        return Decoration.set(widgets, true);
    }
}