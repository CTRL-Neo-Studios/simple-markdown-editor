// ~/utils/codemirror-rich-markdoc/parsers/hashtagParser.ts
// (Replaces your existing hashtagParser.ts)
import { Tag, tags as t } from '@lezer/highlight';
import type { MarkdownConfig, InlineContext } from '@lezer/markdown';

export const hashtag = Tag.define(); // Use existing if already defined in highlightStyle
export const hashtagMark = Tag.define(hashtag); // Use existing
export const hashtagLabel = Tag.define(hashtag); // Use existing

const hashtagRE = /^[^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+/;

export const obsHashtagParser: MarkdownConfig = { // Renamed slightly to avoid conflict if old one is cached by IDE
    defineNodes: [ // These should align with your Tag names for styling
        { name: "Hashtag", style: hashtag }, // Node name for the whole tag, maps to the 'hashtag' Tag
        { name: "HashtagMark", style: hashtagMark }, // Node name for '#', maps to 'hashtagMark' Tag
        { name: "HashtagLabel", style: hashtagLabel } // Node name for 'tagname', maps to 'hashtagLabel' Tag
    ],
    parseInline: [
        {
            name: "Hashtag", // This creates the parent 'Hashtag' node
            parse(cx: InlineContext, next: number, pos: number) {
                if (next != 35 /* # */ || cx.char(pos + 1) == 32 /* space */ || cx.char(pos +1) == 35 /* another # */) {
                    // Basic check to avoid # Heading marker
                    return -1;
                }

                // Additional check from your old parser: if at start of line, ensure it's not a header
                if (pos === cx.offset || cx.slice(pos -1, pos) === '\n') { // at start of line (cx.offset is block start)
                    // This check might need to be more robust depending on block context
                }


                const start = pos;
                let currentPos = pos + 1; // After the '#'
                const match = hashtagRE.exec(cx.slice(currentPos, cx.end)); // Use cx.slice

                if (match && match[0].length > 0 && /\D/.test(match[0].charAt(0))) { // Label must exist and not start purely numeric
                    currentPos += match[0].length;
                    // console.log(cx.slice(start, currentPos + 1))
                    return cx.addElement(
                        cx.elt("Hashtag", start, currentPos, [ // Parent element for the whole #tag
                            cx.elt("HashtagMark", start, start + 1),    // '#'
                            cx.elt("HashtagLabel", start + 1, currentPos) // 'tagname'
                        ])
                    );
                }
                return -1;
            },
            after: "Emphasis",
            // Runs after emphasis, etc. Should be okay.
            // Consider `after: "Emphasis"` or similar if conflicts arise.
        },
    ],
};

// Default export for easy import
export default obsHashtagParser;
