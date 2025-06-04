import { HighlightStyle } from '@codemirror/language';
import { Tag, tags as t } from '@lezer/highlight';
import {hashtag, hashtagLabel, hashtagMark} from "~/utils/codemirror-rich-markdoc/parsers/hashtagParser";
import {
    embed, embedMark,
    internalDisplay,
    internalLink,
    internalMark,
    internalPath,
    internalSubpath
} from "~/utils/codemirror-rich-markdoc/parsers/internalLinkParser";
import {mark, markParser} from "~/utils/codemirror-rich-markdoc/parsers/markParser";
import {task, taskMarker} from "~/utils/codemirror-rich-markdoc/parsers/taskListParser";
import {
    footnote,
    footnoteLabel,
    footnoteMark,
    footnoteReference
} from "~/utils/codemirror-rich-markdoc/parsers/footnoteParser";
import {comment, commentMarker} from "~/utils/codemirror-rich-markdoc/parsers/commentParser";
import {texBlock, texInline, texMarker} from "~/utils/codemirror-rich-markdoc/parsers/texParser";
import {yamlContent, yamlFrontmatter, yamlMarker} from "~/utils/codemirror-rich-markdoc/parsers/yamlFrontmatterParser";
// import {blockquote, quoteMark} from "~/utils/codemirror-rich-markdoc/parsers/blockquoteParser";
import {
    callout,
    calloutFoldIndicator,
    calloutMark, calloutTitleString,
    calloutTypeString
} from "~/utils/codemirror-rich-markdoc/parsers/calloutParser";

export default HighlightStyle.define([
    { tag: t.heading, class: 'prose-cm-header-mark' },
    { tag: t.heading1, class: 'prose-cm-h1' }, // container: 'h1' was incorrect for CM class
    { tag: t.heading2, class: 'prose-cm-h2' },
    { tag: t.heading3, class: 'prose-cm-h3' },
    { tag: t.heading4, class: 'prose-cm-h4' },
    { tag: t.heading5, class: 'prose-cm-h5' },
    { tag: t.heading6, class: 'prose-cm-h6' },
    { tag: t.link, class: 'prose-cm-link' },
    { tag: t.emphasis, class: 'prose-cm-emphasis' },
    { tag: t.strong, class: 'prose-cm-strong' },
    { tag: t.monospace, class: 'prose-cm-monospace' }, // For inline code ``
    { tag: t.strikethrough, class: 'prose-cm-strikethrough' },
    { tag: t.contentSeparator, class: 'prose-cm-horizontalrule' }, // For ---
    { tag: t.meta, class: 'prose-cm-meta' }, // Generic meta, good for markers

    // Hashtag (ensure these tags match your hashtagParser definitions)
    { tag: hashtag, class: 'prose-cm-hashtag' },
    { tag: hashtagMark, class: 'prose-cm-hashtag-mark prose-cm-meta' }, // Style the '#'
    { tag: hashtagLabel, class: 'prose-cm-hashtag-label' },         // Style the 'tagname'

    // Internal Links / Embeds (ensure these tags match your internalLinkParser definitions)
    { tag: internalLink, class: 'prose-cm-internal-link' },
    { tag: internalMark, class: 'prose-cm-internal-mark prose-cm-meta' },
    { tag: internalPath, class: 'prose-cm-internal-path' },
    { tag: internalSubpath, class: 'prose-cm-internal-subpath prose-cm-hashtag-label' }, // Can reuse hashtag label style
    { tag: internalDisplay, class: 'prose-cm-internal-display' },
    { tag: embed, class: 'prose-cm-embed' },
    { tag: embedMark, class: 'prose-cm-embed-mark prose-cm-meta' },

    // Highlights (==text==)
    { tag: mark, class: 'prose-cm-highlight' }, // Styles the content
    { tag: markParser, class: 'prose-cm-highlight-marker prose-cm-meta' }, // Styles "=="

    // Task Lists (Task/TaskMarker are likely defined by GFM or your taskListParser)
    { tag: task, class: 'prose-cm-task' }, // The whole task item
    { tag: taskMarker, class: 'prose-cm-task-marker prose-cm-meta' }, // The "[x]" part

    // Footnotes
    { tag: footnote, class: 'prose-cm-footnote' },
    { tag: footnoteLabel, class: 'prose-cm-footnote-label prose-cm-link' }, // Could be styled like a link
    { tag: footnoteMark, class: 'prose-cm-footnote-mark prose-cm-meta' },
    { tag: footnoteReference, class: 'prose-cm-footnote-reference' }, // For the [^label]: definition block

    // Comments
    { tag: comment, class: 'prose-cm-comment' },
    { tag: commentMarker, class: 'prose-cm-comment-marker prose-cm-meta' },

    // TeX / LaTeX
    { tag: texBlock, class: 'prose-cm-tex-block prose-cm-monospace' }, // Style block math
    { tag: texInline, class: 'prose-cm-tex-inline prose-cm-monospace' },// Style inline math
    { tag: texMarker, class: 'prose-cm-tex-marker prose-cm-meta' }, // Style "$" or "$$"

    // YAML Frontmatter
    { tag: yamlFrontmatter, class: 'prose-cm-yaml-frontmatter prose-cm-meta' },
    { tag: yamlMarker, class: 'prose-cm-yaml-marker prose-cm-meta' },
    { tag: yamlContent, class: 'prose-cm-yaml-content prose-cm-meta' },

    // GFM Blockquote styling (relies on Lezer GFM default tags)
    { tag: t.quote, class: 'prose-cm-quote-text' }, // For text inside a blockquote line
    { tag: t.quote, class: 'prose-cm-quote-mark prose-cm-meta' }, // For ">"

    // Callout specific styles
    { tag: callout, class: 'prose-cm-callout' }, // Applied to the whole callout block
    { tag: calloutMark, class: 'prose-cm-callout-mark prose-cm-meta' },
    { tag: calloutTypeString, class: 'prose-cm-callout-type' },
    { tag: calloutFoldIndicator, class: 'prose-cm-callout-fold prose-cm-meta' },
    { tag: calloutTitleString, class: 'prose-cm-callout-title' },
]);
