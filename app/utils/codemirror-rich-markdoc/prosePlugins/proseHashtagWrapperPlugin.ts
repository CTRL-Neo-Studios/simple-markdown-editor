import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';

function buildHashtagWrappers(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];
    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'Hashtag') {
                // Ensure this doesn't conflict with child decorations if they also try to define the tag
                decorations.push(Decoration.mark({
                    class: 'prose-cm-hashtag',
                    tagName: 'span' // Explicitly request a span
                }).range(node.from, node.to));
                // return false; // Optional: if you don't want to iterate into # and label for THIS plugin
            }
        }
    });
    return decorations;
}

export const proseHashtagWrapperPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildHashtagWrappers(state));
    },
    update(value, tr) {
        if (tr.docChanged) { // Or also on selection if visibility changes
            return RangeSet.of(buildHashtagWrappers(tr.state));
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});
