// proseCalloutPlugin.ts
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range } from '@codemirror/state';

function buildCalloutDecorations(state: EditorState): Range<Decoration>[] {
    const decorations: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'Callout') {
                decorations.push(
                    Decoration.mark({ class: 'cm-callout' })
                        .range(node.from, node.to)
                );
            } else if (node.name === 'CalloutMark') {
                decorations.push(
                    Decoration.mark({ class: 'cm-callout-mark' })
                        .range(node.from, node.to)
                );
            } else if (node.name === 'CalloutTypeString') {
                decorations.push(
                    Decoration.mark({ class: 'cm-callout-type' })
                        .range(node.from, node.to)
                );
            } else if (node.name === 'CalloutFoldIndicator') {
                decorations.push(
                    Decoration.mark({ class: 'cm-callout-fold-indicator' })
                        .range(node.from, node.to)
                );
            } else if (node.name === 'CalloutTitleString') {
                decorations.push(
                    Decoration.mark({ class: 'cm-callout-title' })
                        .range(node.from, node.to)
                );
            }
        }
    });

    return decorations;
}

export const proseExpCalloutPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildCalloutDecorations(state));
    },
    update(value, tr) {
        if (tr.docChanged) {
            return RangeSet.of(buildCalloutDecorations(tr.state));
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});
