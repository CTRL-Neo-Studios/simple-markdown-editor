import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';

function buildDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];
    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'MarkdocTag') { // As defined by your tagParser [10]
                decorations.push(Decoration.mark({ class: 'cm-markdoc-tag' }) // [12]
                    .range(node.from, node.to));
            }
        }
    });
    return decorations;
}

export const proseMarkdocTagPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildDecorations(state));
    },
    update(value, tr) {
        if (tr.docChanged) {
            return RangeSet.of(buildDecorations(tr.state));
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});