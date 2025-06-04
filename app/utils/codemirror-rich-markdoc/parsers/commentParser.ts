import type { MarkdownConfig, BlockContext, InlineContext, Line } from '@lezer/markdown';
import {Tag} from "@lezer/highlight";

const CommentDelim = { resolve: "Comment", mark: "CommentMarker" };

export const comment = Tag.define('Comment');
export const commentMarker = Tag.define('CommentMarker');

export const commentParser: MarkdownConfig = {
    defineNodes: [
        {name: "Comment", style: comment},
        {name: "CommentMarker", style: commentMarker}
    ],
    parseBlock: [
        {
            name: "CommentBlock",
            endLeaf: (_, line: Line) => {
                return line.text.slice(line.pos, line.pos + 2) == "%%";
            },
            parse(cx: BlockContext, line: Line) {
                if (line.text.slice(line.pos, line.pos + 2) != "%%") {
                    return false;
                }
                const start = cx.lineStart + line.pos;
                const markers = [cx.elt("CommentMarker", start, start + 2)];
                const regex = /(^|[^\\])\%\%/;
                let remaining = line.text.slice(line.pos + 2);
                let startOffset = 2;
                let match;
                while (!(match = regex.exec(remaining)) && cx.nextLine()) {
                    remaining = line.text;
                    startOffset = 0;
                }
                let end;
                if (match) {
                    const lineEnd = match.index + match[0].length + startOffset;
                    end = cx.lineStart + lineEnd;
                    markers.push(cx.elt("CommentMarker", end - 2, end));
                    if (
                        lineEnd == line.text.length ||
                        /^\s+$/.test(line.text.slice(lineEnd))
                    ) {
                        cx.nextLine();
                    } else {
                        line.pos = line.skipSpace(lineEnd);
                    }
                } else {
                    end = cx.lineStart + line.text.length;
                }
                cx.addElement(cx.elt("Comment", start, end, markers));
                return true;
            },
        },
    ],
    parseInline: [
        {
            name: "CommentInline",
            parse(cx: InlineContext, next: number, pos: number) {
                if (next == 37 && cx.char(pos + 1) == 37) { // % is 37
                    let canClose = true;
                    // Check if this "%%" is closing an existing inline comment on the same line
                    // A simple check: find last newline, find last "%%". If newline is more recent, this can't be a closer.
                    const contentBefore = cx.slice(cx.offset, pos);
                    const lastNewline = contentBefore.lastIndexOf("\n");
                    const lastCommentMark = contentBefore.lastIndexOf("%%");
                    if (lastNewline > lastCommentMark) {
                        canClose = false;
                    }
                    return cx.addDelimiter(CommentDelim, pos, pos + 2, true, canClose);
                }
                return -1;
            },
            // Ensure it runs before common markdown elements that might consume '%'
            before: "Emphasis"
        },
    ],
};
