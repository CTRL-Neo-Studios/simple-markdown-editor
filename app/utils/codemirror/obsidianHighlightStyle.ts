import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Using Tailwind utility classes where possible, or descriptive names for custom CSS
export const obsidianHighlightStyle = HighlightStyle.define([
    { tag: t.heading1, class: 'text-3xl font-bold mt-6 mb-4' },
    { tag: t.heading2, class: 'text-2xl font-bold mt-5 mb-3' },
    { tag: t.heading3, class: 'text-xl font-bold mt-4 mb-2' },
    { tag: t.heading4, class: 'text-lg font-bold mt-3 mb-1' },
    { tag: t.heading5, class: 'text-base font-bold' },
    { tag: t.heading6, class: 'text-sm font-bold' },

    { tag: t.strong, class: 'font-bold' },
    { tag: t.emphasis, class: 'italic' },
    { tag: t.strikethrough, class: 'line-through' },

    { tag: t.link, class: 'text-blue-600 dark:text-blue-400 underline cursor-pointer' },
    { tag: t.url, class: 'text-gray-500' }, // URL part of a link

    { tag: t.keyword, class: 'text-purple-600' }, // For things like task list markers
    { tag: t.comment, class: 'text-gray-500 italic' }, // For %%comments%% after we parse them
    { tag: t.meta, class: 'text-gray-400' }, // For syntax characters we might not hide completely

    // Code
    // { tag: t.inlineCode, class: 'bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono' },
    { tag: t.monospace, class: 'font-mono' }, // Generic monospace
    { tag: t.content, class: 'text-gray-800 dark:text-gray-200' }, // Default text color

    // List items
    // { tag: t.listMark, class: 'text-gray-600 dark:text-gray-400' }, // For * - + in lists

    // Blockquotes
    { tag: t.quote, class: 'border-l-4 border-gray-300 dark:border-gray-600 pl-3 italic' },
    // { tag: t.quoteMark, class: 'text-gray-400 dark:text-gray-500' },

    // OFM specific (placeholders, might need custom tags later)
    // { tag: HighlightStyle.named('highlight'), class: 'bg-yellow-200 dark:bg-yellow-700' }, // For ==highlight==
]);

export const obsidianSyntaxHighlighting = syntaxHighlighting(obsidianHighlightStyle);