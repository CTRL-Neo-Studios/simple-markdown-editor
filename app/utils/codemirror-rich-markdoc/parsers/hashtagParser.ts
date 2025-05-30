// ~/utils/codemirror-rich-markdoc/hashtagParser.ts
import {Tag, tags as t} from '@lezer/highlight';
import type { MarkdownConfig } from '@lezer/markdown';

export const hashtag = Tag.define()
export const hashtagMark = Tag.define()
export const hashtagLabel = Tag.define()

export default {
    defineNodes: [
        { name: 'Hashtag', style: hashtag }
    ],
    parseInline: [{
        name: 'Hashtag',
        parse(cx, next, pos) {
            // Check if we're at a '#' character
            if (next !== 35) return -1; // 35 is the char code for '#'

            // Get the current line's content to check context
            // console.log(cx.lineStart, cx.offset) "undefined, 0" what??????? and yet it still works
            const lineStart = cx.offset;
            const relativePos = pos - lineStart;

            // If we're at the very start of a line, check if it's a header
            if (relativePos === 0) {
                // Check if the next character is a space or another #
                const nextChar = cx.char(pos + 1);
                if (nextChar === 32 || nextChar === 35) { // space or #
                    return -1; // This is a header, not a hashtag
                }
            }

            // Check if there's at least one valid character after #
            let end = pos + 1;

            // First character after # must be alphanumeric
            const firstChar = cx.char(end);
            if (!((firstChar >= 48 && firstChar <= 57) || // 0-9
                (firstChar >= 65 && firstChar <= 90) || // A-Z
                (firstChar >= 97 && firstChar <= 122))) { // a-z
                return -1;
            }

            // Continue parsing valid hashtag characters
            while (end < cx.end) {
                const char = cx.char(end);
                // Allow alphanumeric, dash, underscore, dot, slash
                if ((char >= 48 && char <= 57) || // 0-9
                    (char >= 65 && char <= 90) || // A-Z
                    (char >= 97 && char <= 122) || // a-z
                    char === 45 || // dash
                    char === 95 || // underscore
                    char === 46 || // dot
                    char === 47) { // slash
                    end++;
                } else {
                    break;
                }
            }

            // If we found a valid hashtag, add it to the tree
            if (end > pos + 1) {
                return cx.addElement(cx.elt('Hashtag', pos, end));
            }

            return -1;
        },
        // Add this to ensure hashtags can be parsed after block elements
        after: 'Emphasis'
    }]
} as MarkdownConfig;