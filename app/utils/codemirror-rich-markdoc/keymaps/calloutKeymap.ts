// calloutKeymap.ts
import { keymap } from '@codemirror/view';
import { EditorSelection, EditorState, Transaction } from '@codemirror/state';

function isInCallout(state: EditorState): boolean {
    const { doc, selection } = state;
    const { from } = selection.main;

    // Get the line content
    const line = doc.lineAt(from);
    const lineContent = line.text;

    // Check if this line or previous lines have callout markers
    if (lineContent.match(/^\s*>\s*\[!/)) {
        return true;
    }

    // Check previous lines to see if we're in a callout
    let curLine = line.number - 1;
    while (curLine > 0) {
        const prevLine = doc.line(curLine);
        const prevContent = prevLine.text;

        if (prevContent.match(/^\s*>\s*\[!/)) {
            return true;
        }

        if (!prevContent.match(/^\s*>/)) {
            break;
        }

        curLine--;
    }

    return false;
}

// Handle Enter key in callouts to continue the blockquote prefix
function handleEnterInCallout(state: EditorState): Transaction | null {
    const { doc, selection } = state;
    const { from } = selection.main;

    if (!isInCallout(state)) return null;

    const line = doc.lineAt(from);
    const lineContent = line.text;

    // Match callout line patterns (both first line and continuation)
    const firstLineMatch = lineContent.match(/^(\s*)>\s*\[!.*?\]/);
    const continuationMatch = lineContent.match(/^(\s*)>\s*/);

    if (firstLineMatch || continuationMatch) {
        const match = firstLineMatch || continuationMatch;
        const indent = match![1];
        let insertText = `\n${indent}> `;

        // Don't continue if the current line is empty except for the prefix
        if (lineContent.trim() === '>') {
            insertText = '\n\n';
        }

        return state.update({
            changes: { from, to: from, insert: insertText },
            selection: EditorSelection.cursor(from + insertText.length)
        });
    }

    return null;
}

export const calloutEnterKeymap = keymap.of([
    {
        key: 'Enter',
        run: handleEnterInCallout
    }
]);
