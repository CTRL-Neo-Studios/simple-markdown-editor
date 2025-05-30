// ~/utils/codemirror-rich-markdoc/parsers/obsidianMarkdown.ts
import { type Input } from "@lezer/common";
import {
    BlockContext,
    Element,
    InlineContext,
    LeafBlock,
    type LeafBlockParser,
    Line,
    type MarkdownConfig,
    parser as defParser,
    Strikethrough,
    Table,
} from "@lezer/markdown";

declare module "@lezer/markdown" {
    interface BlockContext {
        readonly input: Input;
        checkedYaml?: boolean | null;
    }
}

// Enhanced TaskList parser that better handles indentation
class TaskParser implements LeafBlockParser {
    nextLine() {
        return false;
    }

    finish(cx: BlockContext, leaf: LeafBlock) {
        // Parse the task marker to separate checkbox from content
        const content = leaf.content;
        const match = content.match(/^(\[[\sxX]\])\s*(.*)/);

        if (match) {
            const [, checkbox, taskContent] = match;
            const checkboxEnd = leaf.start + checkbox.length;

            cx.addLeafElement(
                leaf,
                cx.elt("Task", leaf.start, leaf.start + content.length, [
                    cx.elt("TaskMarker", leaf.start, checkboxEnd),
                    ...cx.parser.parseInline(taskContent, checkboxEnd + 1), // +1 for space
                ])
            );
        } else {
            // Fallback
            cx.addLeafElement(
                leaf,
                cx.elt("Task", leaf.start, leaf.start + content.length, [
                    cx.elt("TaskMarker", leaf.start, leaf.start + 3),
                    ...cx.parser.parseInline(content.slice(3), leaf.start + 3),
                ])
            );
        }

        return true;
    }
}

export const TaskList: MarkdownConfig = {
    defineNodes: [{ name: "Task", block: true }, "TaskMarker"],
    parseBlock: [
        {
            name: "TaskList",
            leaf(cx: BlockContext, leaf: LeafBlock) {
                // Check if this is a task list item - look for pattern like "[ ]" or "[x]"
                return /^\[[\sxX]\]/.test(leaf.content) && cx.parentType().name == "ListItem"
                    ? new TaskParser()
                    : null;
            },
            after: "SetextHeading",
        },
    ],
};

// Hashtag support
const hashtagRE = /^[^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+/;

export const Hashtag: MarkdownConfig = {
    defineNodes: ["Hashtag", "HashtagMark", "HashtagLabel"],
    parseInline: [
        {
            name: "Hashtag",
            parse(cx: InlineContext, next: number, pos: number) {
                if (next != 35 /* # */) {
                    return -1;
                }
                const start = pos;
                pos += 1;
                const match = hashtagRE.exec(cx.text.slice(pos - cx.offset));
                if (match && /\D/.test(match[0])) {
                    pos += match[0].length;
                    return cx.addElement(
                        cx.elt("Hashtag", start, pos, [
                            cx.elt("HashtagMark", start, start + 1),
                            cx.elt("HashtagLabel", start + 1, pos),
                        ])
                    );
                }
                return -1;
            },
        },
    ],
};

// Internal Links [[]]
export const InternalLink: MarkdownConfig = {
    defineNodes: [
        "Embed",
        "EmbedMark",
        "InternalLink",
        "InternalMark",
        "InternalPath",
        "InternalSubpath",
        "InternalDisplay",
    ],
    parseInline: [
        {
            name: "InternalLink",
            parse(cx: InlineContext, _, pos: number) {
                const el = parseInternalLink(cx, pos);
                if (el) {
                    return cx.addElement(el);
                }
                return -1;
            },
            before: "Link",
        },
        {
            name: "Embed",
            parse(cx: InlineContext, next: number, pos: number): number {
                if (next != 33) {
                    return -1;
                }
                const link = parseInternalLink(cx, pos + 1);
                if (link) {
                    const embedMark = cx.elt("EmbedMark", pos, pos + 1);
                    return cx.addElement(
                        cx.elt("Embed", pos, link.to, [embedMark, link])
                    );
                }
                return -1;
            },
            before: "Image",
        },
    ],
};

function parseInternalLink(cx: InlineContext, pos: number): Element | null {
    if (
        cx.char(pos) != 91 /* [ */ ||
        cx.char(pos + 1) != 91 ||
        !isClosedLink(cx, pos)
    ) {
        return null;
    }

    const contents: Element[] = [];
    contents.push(cx.elt("InternalMark", pos, pos + 2));
    pos = cx.skipSpace(pos + 2);

    const path = parsePath(cx, pos - cx.offset, cx.offset);
    if (path) {
        contents.push(path);
        pos = cx.skipSpace(path.to);
    }

    const subpath = parseSubpath(cx, pos);
    if (subpath) {
        contents.push(subpath);
        pos = cx.skipSpace(subpath.to);
    }

    if (path == null && subpath == null) {
        return null;
    }

    if (cx.char(pos) == 124 /* | */) {
        contents.push(cx.elt("InternalMark", pos, pos + 1));
        pos += 1;
        const display = parseDisplay(cx, pos);
        if (display) {
            contents.push(display);
            pos = cx.skipSpace(display.to);
        }
    }

    contents.push(cx.elt("InternalMark", pos, pos + 2));
    return cx.elt(
        "InternalLink",
        contents[0].from,
        contents[contents.length - 1].to,
        contents
    );
}

function isClosedLink(cx: InlineContext, start: number): boolean {
    for (let pos = start + 2; pos < cx.end; pos++) {
        if (cx.char(pos) == 91 /* [ */ && cx.char(pos + 1) == 91) {
            return false;
        } else if (cx.char(pos) == 93 /* ] */ && cx.char(pos + 1) == 93) {
            return pos > start + 2;
        }
    }
    return false;
}

function parsePath(cx: InlineContext, start: number, offset: number): Element | null {
    const match = /^[^[\]|#^\\/]+/.exec(cx.text.slice(start));
    if (match) {
        return cx.elt("InternalPath", offset + start, offset + start + match[0].length);
    }
    return null;
}

function parseSubpath(cx: InlineContext, start: number): Element | null {
    if (cx.char(start) != 35 /* # */) {
        return null;
    }
    for (let pos = start + 1; pos < cx.end; pos++) {
        if (
            cx.char(pos) == 124 /* | */ ||
            (cx.char(pos) == 93 /* ] */ && cx.char(pos + 1) == 93)
        ) {
            return cx.elt("InternalSubpath", start, pos);
        }
    }
    return null;
}

function parseDisplay(cx: InlineContext, start: number): Element | null {
    for (let pos = start; pos < cx.end; pos++) {
        if (cx.char(pos) == 93 /* ] */ && cx.char(pos + 1) == 93) {
            if (pos == start) {
                return null;
            }
            return cx.elt("InternalDisplay", start, pos);
        }
    }
    return null;
}

// Highlight/Mark syntax ==text==
export const MarkDelim = { resolve: "Mark", mark: "MarkMarker" };

export const Mark: MarkdownConfig = {
    defineNodes: ["Mark", "MarkMarker"],
    parseInline: [
        {
            name: "Mark",
            parse(cx: InlineContext, next: number, pos: number) {
                if (next != 61 /* '=' */ || cx.char(pos + 1) != 61) return -1;
                return cx.addDelimiter(MarkDelim, pos, pos + 2, true, true);
            },
        },
    ],
};

// All Obsidian extensions
export const ObsidianExtensions = [
    Hashtag,
    InternalLink,
    Mark,
    Strikethrough,
    Table,
    TaskList,
];

export const ofmParser = defParser.configure(ObsidianExtensions);