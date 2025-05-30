import { HighlightStyle } from '@codemirror/language';
import {Tag, tags as t} from '@lezer/highlight';
import {hashtag, hashtagLabel, hashtagMark} from "~/utils/codemirror-rich-markdoc/parsers/hashtagParser";

export const internalLink = Tag.define('InternalLink')
export const internalMark = Tag.define('InternalMark')
export const internalPath = Tag.define('InternalPath')
export const internalDisplay = Tag.define('InternalDisplay')
export const mark = Tag.define('Mark')
export const markMarker = Tag.define('MarkMarker')
export const task = Tag.define('Task')
export const taskMarker = Tag.define('taskMarker')

export default HighlightStyle.define([
    { tag: t.heading, class: 'prose-cm-header-mark' },
    { tag: t.heading1, container: 'h1', class: 'prose-cm-h1' },
    { tag: t.heading2, container: 'h1', class: 'prose-cm-h2' },
    { tag: t.heading3, container: 'h1', class: 'prose-cm-h3' },
    { tag: t.heading4, container: 'h1', class: 'prose-cm-h4' },
    { tag: t.heading5, container: 'h1', class: 'prose-cm-h5' },
    { tag: t.heading6, container: 'h1', class: 'prose-cm-h6' },
    { tag: t.link, class: 'prose-cm-link' },
    { tag: t.emphasis, class: 'prose-cm-emphasis' },
    { tag: t.strong, class: 'prose-cm-strong' },
    { tag: t.monospace, class: 'prose-cm-monospace' },
    { tag: t.content, class: 'prose-cm-content' },
    { tag: t.meta, class: 'prose-cm-meta' },
    { tag: hashtag, class: 'prose-cm-hashtag' },
    { tag: t.strikethrough, class: 'prose-cm-strikethrough' },
    { tag: t.contentSeparator, class: 'prose-cm-horizontalrule' },

    { tag: hashtag, class: 'prose-cm-hashtag' },
    { tag: hashtagMark, class: 'prose-cm-hashtag-mark' },
    { tag: hashtagLabel, class: 'prose-cm-hashtag-label' },
    { tag: internalLink, class: 'prose-cm-internal-link' },
    { tag: internalMark, class: 'prose-cm-internal-mark' },
    { tag: internalPath, class: 'prose-cm-internal-path' },
    { tag: internalDisplay, class: 'prose-cm-internal-display' },
    { tag: mark, class: 'prose-cm-highlight' },
    { tag: markMarker, class: 'prose-cm-highlight-marker' },
    { tag: task, class: 'prose-cm-task' },
    { tag: taskMarker, class: 'prose-cm-task-marker' },
]);