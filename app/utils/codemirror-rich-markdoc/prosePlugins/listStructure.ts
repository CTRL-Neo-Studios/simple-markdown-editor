// ~/utils/codemirror-rich-markdoc/prosePlugins/listStructure.ts

import type {EditorState} from "@codemirror/state";

export interface ListItem {
    lineNumber: number;
    from: number;
    to: number;
    level: number;
    type: 'ordered' | 'unordered' | 'task';
    marker: string;
    isChecked?: boolean;
    content: string;
    indentSpaces: number;
}

export function detectListStructure(state: EditorState): ListItem[] {
    const listItems: ListItem[] = [];

    for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
        const line = state.doc.line(lineNum);
        const lineText = line.text;

        // Match various list patterns
        const patterns = [
            // Ordered lists: "1. ", "2. ", etc.
            /^(\s*)(\d+\.)\s+(.*)/,
            // Unordered lists: "- ", "* ", "+ "
            /^(\s*)([-*+])\s+(.*)/,
            // Task lists: "- [ ] ", "- [x] ", etc.
            /^(\s*)([-*+])\s*(\[[\sxX]\])\s+(.*)/
        ];

        for (const pattern of patterns) {
            const match = lineText.match(pattern);
            if (match) {
                const [fullMatch, indentPart, marker, checkboxOrContent, taskContent] = match;
                const indentSpaces = indentPart.length;
                const level = Math.floor(indentSpaces / 2) + 1; // 2 spaces per level, start at 1

                let type: 'ordered' | 'unordered' | 'task';
                let isChecked: boolean | undefined;
                let content: string;

                if (taskContent !== undefined) {
                    // Task list
                    type = 'task';
                    const checkbox = checkboxOrContent;
                    isChecked = checkbox.toLowerCase().includes('x');
                    content = taskContent;
                } else if (/^\d+\.$/.test(marker)) {
                    // Ordered list
                    type = 'ordered';
                    content = checkboxOrContent;
                } else {
                    // Unordered list
                    type = 'unordered';
                    content = checkboxOrContent;
                }

                listItems.push({
                    lineNumber: lineNum,
                    from: line.from,
                    to: line.to,
                    level,
                    type,
                    marker,
                    isChecked,
                    content: content.trim(),
                    indentSpaces
                });

                break; // Found a match, don't check other patterns
            }
        }
    }

    return listItems;
}