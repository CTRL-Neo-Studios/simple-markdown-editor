// ~/utils/codemirror-rich-markdoc/hashtagParser.ts
import {Tag, tags as t} from '@lezer/highlight';
import type { MarkdownConfig } from '@lezer/markdown';

export const hashtag = Tag.define()

export default {
    defineNodes: [
        { name: 'Hashtag', style: hashtag }
    ],
    parseInline: [{
        name: 'Hashtag',
        parse(cx, next, pos) {
            // Check if we're at a '#' character
            if (next !== 35) return -1; // 35 is the char code for '#'

            // Don't parse if it's at the start of a line followed by space (that's a header)
            const lineStart = cx.offset;
            if (pos === lineStart && cx.char(pos + 1) === 32) return -1; // 32 is space

            // Check if there's at least one valid character after #
            let end = pos + 1;
            const text = cx.text;

            // First character after # must be alphanumeric
            const firstChar = cx.char(end);
            if (!((firstChar >= 48 && firstChar <= 57) || // 0-9
                (firstChar >= 65 && firstChar <= 90) || // A-Z
                (firstChar >= 97 && firstChar <= 122))) { // a-z
                return -1;
            }

            // Continue parsing valid hashtag characters
            while (end < text.length) {
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
        }
    }]
} as MarkdownConfig;