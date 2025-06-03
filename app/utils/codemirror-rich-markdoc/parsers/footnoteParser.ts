// ~/utils/codemirror-rich-markdoc/parsers/footnoteParser.ts
import type { MarkdownConfig, BlockContext, InlineContext, LeafBlock, LeafBlockParser, Line } from '@lezer/markdown';
import {Tag} from "@lezer/highlight";

export const footnote = Tag.define('Footnote');
export const footnoteLabel = Tag.define('FootnoteLabel');
export const footnoteMark = Tag.define('FootnoteMark');
export const footnoteReference = Tag.define('FootnoteReference');

class FootnoteReferenceParser implements LeafBlockParser {
    constructor(private labelEnd: number) {}

    nextLine(cx: BlockContext, line: Line, leaf: LeafBlock) {
        if (isFootnoteRef(line.text) != -1) { // A new footnote def starts
            return this.complete(cx, leaf); // Finalize current one
        }
        // Continue if line is indented or blank (part of multi-line def)
        if (line.text.match(/^\s*$/) || line.indent > leaf.linePos.get(leaf.linePos.length - 1)!) {
            return false; // Part of current footnote definition
        }
        return this.complete(cx, leaf); // Otherwise, current footnote def ends
    }

    finish(cx: BlockContext, leaf: LeafBlock) {
        return this.complete(cx, leaf);
    }

    complete(cx: BlockContext, leaf: LeafBlock) {
        cx.addLeafElement(
            leaf,
            cx.elt(
                "FootnoteReference",
                leaf.start,
                leaf.start + leaf.content.length,
                [
                    cx.elt("FootnoteMark", leaf.start, leaf.start + 2), // "[^"
                    cx.elt("FootnoteLabel", leaf.start + 2, this.labelEnd - 2), // "label"
                    cx.elt("FootnoteMark", this.labelEnd - 2, this.labelEnd), // "]:"
                    ...cx.parser.parseInline(
                        leaf.content.slice(this.labelEnd - leaf.start),
                        this.labelEnd
                    ),
                ]
            )
        );
        return true;
    }
}

export const footnoteParser: MarkdownConfig = {
    defineNodes: [
        {name: "Footnote", style: footnote},         // Inline like [^label]
        {name: "FootnoteLabel", style: footnoteLabel},
        {name: "FootnoteMark", style: footnoteMark},
        {name: "FootnoteReference", style: footnoteReference}, // Block definition like [^label]: text
    ],
    parseInline: [
        {
            name: "Footnote",
            parse(cx: InlineContext, _, pos: number) {
                const match = /^\[\^[^\s[\]]+\]/.exec(cx.slice(pos, cx.end)); // Use cx.slice
                if (match) {
                    const end = pos + match[0].length;
                    return cx.addElement(
                        cx.elt("Footnote", pos, end, [
                            cx.elt("FootnoteMark", pos, pos + 2), // "[^"
                            cx.elt("FootnoteLabel", pos + 2, end - 1), // "label"
                            cx.elt("FootnoteMark", end - 1, end), // "]"
                        ])
                    );
                }
                return -1;
            },
            before: "Link", // Parse before standard links
        },
    ],
    parseBlock: [
        {
            name: "FootnoteReference",
            leaf(cx: BlockContext, leaf: LeafBlock): LeafBlockParser | null {
                const refEndMarkerPos = isFootnoteRef(leaf.content);
                if (refEndMarkerPos != -1) {
                    return new FootnoteReferenceParser(leaf.start + refEndMarkerPos);
                }
                return null;
            },
            before: "LinkReference", // Parse before link definitions
        },
    ],
};

function isFootnoteRef(content: string): number {
    const match = /^\[\^[^\s[\]]+\]:/.exec(content);
    return match ? match[0].length : -1;
}
