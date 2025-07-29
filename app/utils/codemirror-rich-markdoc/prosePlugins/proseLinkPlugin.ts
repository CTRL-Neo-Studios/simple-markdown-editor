import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import {StateField, RangeSet} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import type {EditorState, Range as EditorRange} from '@codemirror/state';
import {isNodeRangeActive} from "./proseInternalLinkPlugin";

function buildLinkDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];

    syntaxTree(state).iterate({
        enter({node}) {
            if (node.name === 'URL' && node.parent?.name !== 'Link') {
                const isActive = isNodeRangeActive(state, node.from, node.to);
                if (!isActive) {
                    const url = state.doc.sliceString(node.from, node.to);
                    decorations.push(Decoration.mark({
                        tagName: 'a',
                        attributes: {
                            href: url,
                            target: '_blank',
                            class: 'cm-link',
                            'data-external-link': 'true',
                            'data-url': url
                        }
                    }).range(node.from, node.to));
                }
            } else if (node.name === 'Link') {
                const isActive = isNodeRangeActive(state, node.from, node.to);
                if (!isActive) {
                    const allMarks = node.getChildren('LinkMark');
                    const urlNode = node.getChild('URL');

                    const openBracket = allMarks.find(m => state.doc.sliceString(m.from, m.to) === '[');
                    const closeBracket = allMarks.find(m => state.doc.sliceString(m.from, m.to) === ']');

                    if (urlNode && openBracket && closeBracket) {
                        const linkTextStart = openBracket.to;
                        const linkTextEnd = closeBracket.from;
                        const url = state.doc.sliceString(urlNode.from, urlNode.to);
                        const text = state.doc.sliceString(linkTextStart, linkTextEnd);

                        const linkAttributes = {
                            'href': url,
                            'target': '_blank',
                            'class': 'cm-link',
                            'data-external-link': 'true',
                            'data-url': url,
                            'data-text': text
                        };

                        // Hide markdown syntax
                        decorations.push(Decoration.replace({}).range(node.from, linkTextStart));
                        decorations.push(Decoration.replace({}).range(linkTextEnd, node.to));

                        // Apply link to text
                        decorations.push(Decoration.mark({
                            tagName: 'a',
                            attributes: linkAttributes
                        }).range(linkTextStart, linkTextEnd));

                        return false; // Don't process children of the Link node
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
