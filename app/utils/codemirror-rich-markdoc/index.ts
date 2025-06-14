import { ViewPlugin } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import {GFM} from '@lezer/markdown';

import tagParser from './parsers/markdocTagParser';
import highlightStyle from './highlightStyle';
import RichEditPlugin from './richEdit';
import renderBlock from './renderBlock';

import { commentParser } from './parsers/commentParser';
import { footnoteParser } from './parsers/footnoteParser';
import obsHashtagParser from './parsers/hashtagParser'; // Default export
import { internalLinkParser } from './parsers/internalLinkParser';
import { markParser } from './parsers/markParser';
import { taskListParser } from './parsers/taskListParser';
import { texParser } from './parsers/texParser';
import { yamlFrontmatterParser } from './parsers/yamlFrontmatterParser';

import type { Config } from '@markdoc/markdoc';
import {calloutParser} from "~/utils/codemirror-rich-markdoc/parsers/calloutParser";

export type MarkdocPluginConfig = { lezer?: any, markdoc: Config };

export default function (config: MarkdocPluginConfig) {
    const ofmLezerExtensions = [
        yamlFrontmatterParser, // YAML should be very early
        commentParser,
        footnoteParser,
        obsHashtagParser, // Use the new one
        internalLinkParser,
        markParser,
        taskListParser, // This Lezer parser defines Task nodes
        texParser,
        tagParser,
        // blockquoteParser,
        calloutParser,
    ];

    const mergedConfig = {
        ...config.lezer ?? {}, // Spreads user-passed lezer config (like codeLanguages)
        extensions: [
            GFM,
            // Order can be important. Parsers with 'before'/'after' help,
            // but generally, more specific or overriding parsers come first.
            { remove: ["SetextHeading"] }, // GFM provides base Markdown + GitHub features (includes its own TaskList, Strikethrough, Table)
            ...ofmLezerExtensions,
                 // The `taskListParser` above is designed to work with GFM's ListItem.
            ...(config.lezer?.extensions ?? []) // Any other extensions passed in
        ],
        nested: { // For Markdoc tag parsing primarily
            blockquote: true,
            list: true,
        }
    };

    return ViewPlugin.fromClass(RichEditPlugin, {
        decorations: v => v.decorations,
        provide: v => [
            renderBlock(config.markdoc), // Your Markdoc renderBlock widget
            syntaxHighlighting(highlightStyle),
            markdown(mergedConfig) // The core markdown extension with all parsers
        ],
        eventHandlers: {
            mousedown(event, view) {
                if (event.target instanceof Element && event.target.matches('.cm-markdoc-renderBlock *'))
                    view.dispatch({ selection: { anchor: view.posAtDOM(event.target) } });
            }
        }
    });
}
