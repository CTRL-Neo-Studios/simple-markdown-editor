import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range } from '@codemirror/state';

function applyLineLevelClasses(state: EditorState): Range<Decoration>[] {
    const decorations: Range<Decoration>[] = [];
    syntaxTree(state).iterate({
        enter(node) {
            // For ATX Headings (e.g., # H1)
            if (node.name.startsWith('ATXHeading')) {
                const levelMatch = node.name.match(/ATXHeading(\d)/);
                if (levelMatch && levelMatch[1]) {
                    const level = parseInt(levelMatch[1], 10);
                    const line = state.doc.lineAt(node.from);
                    // Apply a class to the entire line
                    decorations.push(Decoration.line({
                        attributes: { class: `prose-cm-line-heading prose-cm-line-heading${level} prose-cm-h${level}` }
                    }).range(line.from)); // Apply decoration at the start of the line
                }
            }

            // For Blockquotes
            if (node.name.startsWith('Blockquote')) { // Matches 'Blockquote', 'Blockquote1' etc.
                const lineStartInfo = state.doc.lineAt(node.from);
                const lineEndInfo = state.doc.lineAt(node.to); // node.to is exclusive end

                // Iterate over all document lines spanned by this blockquote node
                for (let currentLineNumber = lineStartInfo.number; currentLineNumber <= lineEndInfo.number; currentLineNumber++) {
                    const currentLine = state.doc.line(currentLineNumber);
                    // Ensure the line is actually part of this node's span
                    if (currentLine.from <= node.to && currentLine.to >= node.from) {
                        decorations.push(Decoration.line({
                            attributes: { class: `prose-cm-blockquote` }
                            // For level-specific blockquote classes (e.g., cm-line-blockquote-1),
                            // you would need to calculate the blockquote depth in the syntax tree.
                        }).range(currentLine.from));
                    }
                }
            }

            // For Fenced Code Blocks
            if (node.name === 'FencedCode') {
                const lineStartInfo = state.doc.lineAt(node.from); // Line of opening ```
                const lineEndInfo = state.doc.lineAt(node.to);     // Line of closing ```

                // Iterate over all document lines spanned by this FencedCode node
                for (let currentLineNumber = lineStartInfo.number; currentLineNumber <= lineEndInfo.number; currentLineNumber++) {
                    const currentLine = state.doc.line(currentLineNumber);
                    // Ensure the line is actually part of this node's span
                    if (currentLine.from <= node.to && currentLine.to >= node.from) {
                        let classNames = ['prose-cm-codeblock'];

                        if (currentLineNumber === lineStartInfo.number) {
                            classNames.push('prose-cm-codeblock-begin');
                        }
                        if (currentLineNumber === lineEndInfo.number) {
                            classNames.push('prose-cm-codeblock-end');
                        }

                        decorations.push(Decoration.line({
                            attributes: { class: classNames.join(' ') }
                        }).range(currentLine.from));
                    }
                }
            }
            // Add similar logic for other block types like list items, blockquotes, etc.
            // if you want line-level classes for them.
        }
    });
    return decorations;
}

export const lineStylingPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(applyLineLevelClasses(state));
    },
    update(value, tr) {
        // Only recompute if document changed.
        // You might also need to update on selection changes if visibility of styles depends on it.
        if (tr.docChanged) {
            return RangeSet.of(applyLineLevelClasses(tr.state));
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});

// Then, you would add 'lineStylingPlugin' to your CodeMirror extensions array [9].