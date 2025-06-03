// ~/utils/codemirror-rich-markdoc/parsers/taskListParser.ts
import type { MarkdownConfig, BlockContext, LeafBlock, LeafBlockParser } from '@lezer/markdown';
import {Tag} from "@lezer/highlight";

export const task = Tag.define('Task');
export const taskMarker = Tag.define('TaskMarker'); // Note casing if TaskList parser uses "TaskMarker"

/*
  Copyright (C) 2020 by Marijn Haverbeke <marijnh@gmail.com> and others
  https://github.com/lezer-parser/markdown/blob/f49eb8c8c82cfe45aa213ca1fe2cebc95305b88b/LICENSE
*/

class TaskParserImpl implements LeafBlockParser { // Renamed to avoid conflict if imported elsewhere
    nextLine() {
        return false; // Task content is inline, doesn't span multiple lines for this parser.
    }

    finish(cx: BlockContext, leaf: LeafBlock) {
        // The task marker itself, e.g., "[ ] " or "[x] " (usually 3 chars + space, but can vary)
        // The leaf.content starts with the task marker.
        // Let's find the end of the marker (first 3 chars typically like "[ ]" or "[x]")
        const markerEnd = leaf.start + 3; // Assuming marker is like '[x]'

        cx.addLeafElement(
            leaf,
            cx.elt("Task", leaf.start, leaf.start + leaf.content.length, [
                // The TaskMarker includes the brackets and the character inside, e.g., "[ ]" or "[x]"
                cx.elt("TaskMarker", leaf.start, markerEnd),
                // The rest of the line is parsed as inline content (the task description)
                ...cx.parser.parseInline(leaf.content.slice(3), markerEnd),
                // Note: The space after "[ ] " is part of general list item parsing, not explicitly TaskMarker here.
            ])
        );
        return true;
    }
}

export const taskListParser: MarkdownConfig = {
    defineNodes: [
        { name: "Task", block: true, style: task }, // Node for the entire task item line
        {name: "TaskMarker", style: taskMarker}                   // Node for "[ ]" or "[x]"
    ],
    parseBlock: [
        {
            name: "TaskList", // This name is somewhat conventional, the work is done in the leaf parser
            leaf(cx: BlockContext, leaf: LeafBlock) {
                // Check if the leaf content starts with a task marker format like "[.] "
                // and if the parent node is a "ListItem" (as GFM tasks are list items)
                if (/^\[.?\]\s/.test(leaf.content) && cx.parentType().name == "ListItem") {
                    return new TaskParserImpl();
                }
                return null;
            },
            // Ensure it runs after list items are identified
            after: "ListItem", // Or "SetextHeading" as in original, but "ListItem" is more direct
        },
    ],
};
