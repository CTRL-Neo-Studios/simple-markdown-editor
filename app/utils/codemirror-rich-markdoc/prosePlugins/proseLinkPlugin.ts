import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import {StateField, RangeSet} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import type {EditorState, Range as EditorRange} from '@codemirror/state';
import {isNodeRangeActive} from "./proseInternalLinkPlugin";

function buildLinkDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];

    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'Link' || node.name === 'URL') {
                const isActive = isNodeRangeActive(state, node.from, node.to);

                if (!isActive) {
                    if (node.name === 'URL') {
                        const url = state.doc.sliceString(node.from, node.to);
                        decorations.push(Decoration.mark({
                            tagName: 'a',
                            attributes: {href: url, target: '_blank'}
                        }).range(node.from, node.to));
                    } else if (node.name === 'Link') {
                        const urlNode = node.node.getChild('URL');
                        if (urlNode) {
                            const url = state.doc.sliceString(urlNode.from, urlNode.to);
                            decorations.push(Decoration.mark({
                                tagName: 'a',
                                attributes: {href: url, target: '_blank'}
                            }).range(node.from, node.to));
                        }
                    }
                }
            }
        }
    });

    return decorations;
}

export const proseLinkPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildLinkDecorations(state), true);
    },
    update(value, tr) {
        if (tr.docChanged || tr.selection) {
            return RangeSet.of(buildLinkDecorations(tr.state), true);
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});
