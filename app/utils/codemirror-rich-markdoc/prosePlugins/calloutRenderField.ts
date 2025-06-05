// calloutRenderField.ts
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { StateField, RangeSet, EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { ExpCalloutWidget } from './widget/ExpCalloutWidget';

export function findCallouts(state: EditorState): Range<Decoration>[] {
    const decorations: Range<Decoration>[] = [];
    const [cursor] = state.selection.ranges;

    syntaxTree(state).iterate({
        enter(node) {
            if (node.name !== 'Callout') return;

            // Skip decoration if cursor is inside this callout (to allow editing)
            if (cursor.from >= node.from && cursor.to <= node.to)
                return;

            // Get the callout content
            const content = state.doc.sliceString(node.from, node.to);

            // Create a decoration that replaces the callout with our widget
            decorations.push(
                Decoration.replace({
                    widget: new ExpCalloutWidget(content),
                    block: true,
                    inclusive: true
                }).range(node.from, node.to)
            );
        }
    });

    return decorations;
}

export const calloutRenderField = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(findCallouts(state));
    },

    update(decorations, transaction) {
        if (transaction.docChanged || transaction.selection) {
            return RangeSet.of(findCallouts(transaction.state));
        }
        return decorations.map(transaction.changes);
    },

    provide: field => EditorView.decorations.from(field)
});
