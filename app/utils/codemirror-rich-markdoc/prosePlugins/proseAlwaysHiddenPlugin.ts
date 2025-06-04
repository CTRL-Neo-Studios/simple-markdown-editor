import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';

const alwaysHiddenTokens = [
    'CodeInfo',
    // 'LinkSpecificURL',
];

function buildDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];
    if (alwaysHiddenTokens.length === 0) return decorations;

    syntaxTree(state).iterate({
        enter(node) {
            // Skip if inside FencedCode, as codeBlockStylePlugin should manage its children
            let inFencedCode = false;
            let tempParent = node.node.parent;
            while (tempParent) {
                if (tempParent.name === 'FencedCode') {
                    inFencedCode = true;
                    break;
                }
                tempParent = tempParent.parent;
            }
            if (inFencedCode) return false; // Do not process children of FencedCode here

            if (alwaysHiddenTokens.includes(node.name)) {
                decorations.push(Decoration.replace({}).range(node.from, node.to));
            }
        }
    });
    return decorations;
}

export const proseAlwaysHiddenPlugin = StateField.define<DecorationSet>({
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