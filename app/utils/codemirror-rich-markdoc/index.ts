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
import { obsHashtagParser } from './parsers/hashtagParser'; // Default export
import { internalLinkParser } from './parsers/internalLinkParser';
import { markParser } from './parsers/markParser';
import { taskListParser } from './parsers/taskListParser';
import { texParser } from './parsers/texParser';
import { yamlFrontmatterParser } from './parsers/yamlFrontmatterParser';
import { latex } from '~/utils/codemirror-rich-markdoc/latexPlugin';

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
        ...config.lezer ?? {},
        extensions: [
            GFM,
            { remove: ["SetextHeading"] }, // I fuckin hate Setext Headers. Also it conflicts with linebreaks
            ...ofmLezerExtensions,
            ...(config.lezer?.extensions ?? [])
        ],
        nested: { // For Markdoc tag parsing primarily
            blockquote: true,
            list: true,
        }
    };

    return ViewPlugin.fromClass(RichEditPlugin, {
        decorations: v => v.decorations,
        provide: v => [
            renderBlock(config.markdoc), // Markdoc renderBlock widget
            syntaxHighlighting(highlightStyle),
            markdown(mergedConfig), // The core markdown extension with all parsers
            latex()
        ],
        // eventHandlers: {
        //     mouseup(event, view) {
        //         // if (event.target instanceof Element && event.target.matches('.cm-markdoc-renderBlock *'))
        //         if (event.target instanceof Element)
        //             view.dispatch({ selection: { anchor: view.posAtDOM(event.target) } });
        //     }
        // }
    });
}
