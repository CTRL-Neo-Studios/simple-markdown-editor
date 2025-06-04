import type { MarkdownConfig, InlineContext } from '@lezer/markdown';
import {Tag} from "@lezer/highlight";

export const mark = Tag.define('Mark');
export const markMarker = Tag.define('MarkMarker');

export const MarkDelim = { resolve: "Mark", mark: "MarkMarker" };

export const markParser: MarkdownConfig = {
    defineNodes: [
        {name: "Mark", style: mark},
        {name: "MarkMarker", style: markMarker}
    ], // Mark for the content, MarkMarker for "=="
    parseInline: [
        {
            name: "Mark", // This will be the node for the highlighted text content
            parse(cx: InlineContext, next: number, pos: number) {
                if (next != 61 /* '=' */ || cx.char(pos + 1) != 61) return -1;
                return cx.addDelimiter(MarkDelim, pos, pos + 2, true, true);
            },
            // Higher precedence than emphasis will prevent "*==text==*" issues for example
            after: "Emphasis"
        },
    ],
};
