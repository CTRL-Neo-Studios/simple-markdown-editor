// ~/utils/codemirror-rich-markdoc/prosePlugins/proseCalloutPlugin.ts
import {Decoration, type DecorationSet, EditorView, WidgetType} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';
import { CalloutWidget } from './widget/CalloutWidget';

function isNodeRangeActive(state: EditorState, nodeFrom: number, nodeTo: number): boolean {
    const cursor = state.selection.main;
    if (cursor.empty) {
        return cursor.from >= nodeFrom && cursor.from <= nodeTo;
    } else {
        return Math.max(nodeFrom, cursor.from) < Math.min(nodeTo, cursor.to);
    }
}

function buildCalloutWidgetDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];

    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'Callout') { // From our calloutParser
                const isActive = isNodeRangeActive(state, node.from, node.to);

                if (!isActive) {
                    decorations.push(Decoration.replace({
                        widget: new CalloutWidget(node.from, node.to),
                        block: true, // Ensure it takes up its own block space
                    }).range(node.from, node.to));
                }
                // If active, the raw Markdown source is shown (styled by highlightStyle + proseBlockquotePlugin)
                return false; // Don't iterate into children of a Callout for *this* plugin's purpose
            }
        }
    });
    return decorations;
}

export const proseCalloutPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildCalloutWidgetDecorations(state), true);
    },
    update(value, tr) {
        if (tr.docChanged || tr.selection) {
            return RangeSet.of(buildCalloutWidgetDecorations(tr.state), true);
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});
