// ~/utils/codemirror-rich-markdoc/keymaps/calloutKeymap.ts
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { indentUnit } from '@codemirror/language'; // For indentation string

export const calloutEnterKeymap = Prec.high(keymap.of([
    {
        key: 'Enter',
        run: (view): boolean => {
            const { state, dispatch } = view;
            const { selection } = state;
            if (!selection.main.empty) return false; // Don't interfere with selection replacement

            const pos = selection.main.head;
            const line = state.doc.lineAt(pos);
            let inCalloutContent = false;
            let calloutNodeStart = -1;

            syntaxTree(state).iterate({
                enter: (nodeRef) => {
                    if (nodeRef.name === 'Callout') {
                        if (pos > nodeRef.from && pos <= nodeRef.to) { // Cursor is within a Callout block
                            // Check if it's NOT the first line (the definition line)
                            const firstCalloutLine = state.doc.lineAt(nodeRef.from);
                            if (line.from > firstCalloutLine.from) {
                                inCalloutContent = true;
                                calloutNodeStart = nodeRef.from;
                            }
                        }
                        return false; // Stop iterating if cursor not in this callout or already processed
                    }
                },
                from: line.from, // Optimization: start search from current line
                to: line.to,
            });

            // More robust check: iterate up from cursor to find encompassing Callout node
            if (!inCalloutContent) {
                let treeNode = syntaxTree(state).resolveInner(pos, -1); // Check node at cursor
                while (treeNode) {
                    if (treeNode.name === 'Callout') {
                        const firstCalloutLine = state.doc.lineAt(treeNode.from);
                        if (line.from > firstCalloutLine.from && pos <= treeNode.to) { // Ensure cursor is in content part
                            inCalloutContent = true;
                            calloutNodeStart = treeNode.from; // Not really needed here, just for confirmation
                        }
                        break;
                    }
                    if (!treeNode.parent) break;
                    treeNode = treeNode.parent;
                }
            }


            if (inCalloutContent) {
                // Get current line's indentation (if any, besides the '>')
                const lineText = line.text;
                const currentIndentStr = lineText.match(/^(\s*)/)?.[0] || "";
                const quotePrefix = "> "; // What to insert

                // Dispatch transaction to insert newline and then the quote prefix
                dispatch(state.update({
                    changes: { from: pos, insert: `\n${currentIndentStr}${quotePrefix}` },
                    selection: { anchor: pos + 1 + currentIndentStr.length + quotePrefix.length }, // +1 for newline
                    scrollIntoView: true,
                    userEvent: 'input'
                }));
                return true; // Handled
            }
            return false; // Not handled, default Enter behavior
        },
    },
]));
