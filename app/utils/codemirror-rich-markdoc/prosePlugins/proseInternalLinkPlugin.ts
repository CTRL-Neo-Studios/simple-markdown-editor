import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

function isNodeRangeActive(state: EditorState, nodeFrom: number, nodeTo: number): boolean {
    const cursor = state.selection.main;
    if (cursor.empty) {
        return cursor.from >= nodeFrom && cursor.from <= nodeTo;
    } else {
        return Math.max(nodeFrom, cursor.from) < Math.min(nodeTo, cursor.to);
    }
}

function buildInternalLinkDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];

    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'InternalLink') {
                const mainNode = node.node;
                const mainNodeFrom = mainNode.from;
                const mainNodeTo = mainNode.to;

                const isActive = isNodeRangeActive(state, mainNodeFrom, mainNodeTo);

                if (!isActive) {
                    let contentContainerNode: SyntaxNode | null = null;
                    if (mainNode.name === 'InternalLink') {
                        contentContainerNode = mainNode;
                    }

                    if (contentContainerNode) {
                        const pathNode = contentContainerNode.getChild('InternalPath');
                        const subpathNode = contentContainerNode.getChild('InternalSubpath');
                        const aliasNode = contentContainerNode.getChild('InternalDisplay');

                        if (pathNode) {
                            const path = state.doc.sliceString(pathNode.from, pathNode.to);
                            const subpath = subpathNode ? state.doc.sliceString(subpathNode.from, subpathNode.to) : undefined;
                            const alias = aliasNode ? state.doc.sliceString(aliasNode.from, aliasNode.to) : undefined;

                            const linkAttributes: { [key: string]: string } = {
                                'href': '#',
                                'data-internal-link': 'true',
                                'data-path': path,
                            };

                            if (subpath) linkAttributes['data-subpath'] = subpath;
                            if (alias) linkAttributes['data-display'] = alias;

                            if (aliasNode) {
                                // Has alias, linkify alias and hide path/subpath
                                decorations.push(Decoration.mark({ tagName: 'a', attributes: linkAttributes }).range(aliasNode.from, aliasNode.to));
                                decorations.push(Decoration.replace({}).range(pathNode.from, pathNode.to));
                                if (subpathNode) {
                                    decorations.push(Decoration.replace({}).range(subpathNode.from, subpathNode.to));
                                }
                            } else {
                                // No alias, linkify path and subpath together
                                const linkStart = pathNode.from;
                                const linkEnd = subpathNode ? subpathNode.to : pathNode.to;
                                decorations.push(Decoration.mark({ tagName: 'a', attributes: linkAttributes }).range(linkStart, linkEnd));
                            }
                        }

                        // Hide all markers (`[[`, `]]`, `|`)
                        contentContainerNode.getChildren('InternalMark').forEach(mark => {
                            decorations.push(Decoration.replace({}).range(mark.from, mark.to));
                        });
                    }
                }
                return false;
            }
        }
    });

    return decorations;
}

export { isNodeRangeActive };

export const proseInternalLinkPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildInternalLinkDecorations(state), true);
    },
    update(value, tr) {
        if (tr.docChanged || tr.selection) {
            return RangeSet.of(buildInternalLinkDecorations(tr.state), true);
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});
