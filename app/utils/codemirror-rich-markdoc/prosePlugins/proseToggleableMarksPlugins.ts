// ~/utils/codemirror-rich-markdoc/prosePlugins/toggleableMarksPlugin.ts
import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';

const toggleableMarkTokens = [
    'HeaderMark',
    'QuoteMark',
    'EmphasisMark',
    'StrikethroughMark',
    // 'TaskMarker',
    'CodeMark',
];

// Helper from your RichEditPlugin
function isNodeRangeActive(state: EditorState, nodeFrom: number, nodeTo: number): boolean {
    const cursor = state.selection.main;
    if (cursor.empty) {
        return cursor.from >= nodeFrom && cursor.from <= nodeTo;
    } else {
        return Math.max(nodeFrom, cursor.from) < Math.min(nodeTo, cursor.to);
    }
}

function buildDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];

    syntaxTree(state).iterate({
        enter(node) {
            // Skip if inside FencedCode
            let inFencedCode = false;
            let tempParent = node.node.parent;
            while (tempParent) {
                if (tempParent.name === 'FencedCode') {
                    inFencedCode = true;
                    break;
                }
                tempParent = tempParent.parent;
            }

            if (inFencedCode) return false;

            if (toggleableMarkTokens.includes(node.name)) {
                const parentNode = node.node.parent;
                if (parentNode) {
                    const parentFrom = parentNode.from;
                    const parentTo = parentNode.to;

                    if (!isNodeRangeActive(state, parentFrom, parentTo)) {
                        let markEnd = node.to;

                        // For HeaderMark, we need to also hide the space after the #
                        if (node.name === 'HeaderMark') {
                            // Check if there's a space immediately after the HeaderMark
                            if (state.doc.sliceString(node.to, node.to + 1) === ' ') {
                                markEnd = node.to + 1; // Include the space in the replacement
                            }
                        }

                        decorations.push(Decoration.replace({}).range(node.from, markEnd));
                    }
                }
            }
        }
    });
    return decorations;
}

export const proseToggleableMarksPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildDecorations(state));
    },
    update(value, tr) {
        if (tr.docChanged || tr.selection) {
            return RangeSet.of(buildDecorations(tr.state));
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});