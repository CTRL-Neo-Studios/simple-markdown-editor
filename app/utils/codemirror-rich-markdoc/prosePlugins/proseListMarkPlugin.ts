// ~/utils/codemirror-rich-markdoc/prosePlugins/listMarkPlugin.ts
import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';

function buildDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];
    const cursor = state.selection.main;

    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'ListMark' && node.node.matchContext(['BulletList', 'ListItem']) || node.node.matchContext(['OrderedList', 'ListItem'])) { // [10]
                const lineOfMark = state.doc.lineAt(node.from);
                const lineOfCursor = state.doc.lineAt(cursor.from);

                if (lineOfMark.number !== lineOfCursor.number) {
                    decorations.push(Decoration.mark({ class: 'cm-markdoc-bullet' }) // [12]
                        .range(node.from, node.to));
                }
            }
        }
    });
    return decorations;
}

export const proseListMarkPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildDecorations(state));
    },
    update(value, tr) {
        if (tr.docChanged || tr.selection) { // Selection change affects cursor line
            return RangeSet.of(buildDecorations(tr.state));
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});