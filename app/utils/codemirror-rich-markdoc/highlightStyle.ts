import { HighlightStyle } from '@codemirror/language';
import {Tag, tags as t} from '@lezer/highlight';

export default HighlightStyle.define([
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
    { tag: t.strikethrough, class: 'prose-cm-strikethrough' },
    { tag: t.contentSeparator, class: 'prose-cm-horizontalrule' },
    { tag: Tag.define('TaskMarker'), class: 'prose-cm-task' },
    { tag: Tag.define('Superscript'), class: 'prose-cm-superscript' },
    { tag: Tag.define('Subscript'), class: 'prose-cm-subscript' },
]);