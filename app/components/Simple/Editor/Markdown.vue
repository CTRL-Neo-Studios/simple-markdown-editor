<template>
    <div class="markdown-editor-wrapper border border-gray-300 dark:border-gray-700 rounded-md p-1 bg-white dark:bg-gray-900 h-full p-3">
        <CodeMirror
            v-model="doc"
            placeholder="Start typing your Obsidian-flavored Markdown..."
            :extensions="extensions"
            :style="{ height: '400px' }"
            @ready="handleReady"
            @onChange="logChange"
            @onFocus="logFocus"
            @blur="logBlur"
        />
    </div>
<!--    <div class="mt-4 p-4 border rounded bg-gray-50 dark:bg-gray-800">-->
<!--        <h3 class="text-lg font-semibold mb-2">Raw Markdown:</h3>-->
<!--        <pre class="text-sm whitespace-pre-wrap">{{ doc }}</pre>-->
<!--    </div>-->
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data'; // For GFM fenced code blocks
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';

// Our custom plugins
import { obsidianSyntaxHighlighting } from '~/utils/codemirror/obsidianHighlightStyle';
import { obsidianRichEditPlugin } from '~/utils/codemirror/obsidianRichEditPlugin';
import { obsidianRenderBlockPlugin } from '~/utils/codemirror/obsidianRenderBlockPlugin';


const initialDoc = `# Welcome to the Editor

This is a **WYSIWYG-like** Markdown editor. Try _italic_ or ~~strikethrough~~.

## Features
- [x] Task list item (completed)
- [ ] Task list item (incomplete)
- Hidden Markdown syntax (like \`##\` or \`*\`) when not focused
- Basic block rendering (placeholder for now)

> This is a blockquote.
> With multiple lines.

\`\`\`javascript
function hello() {
  console.log("Hello, CodeMirror!");
}
\`\`\`

A regular paragraph with an [inline link](https://example.com).

---

### Table (will be rendered by placeholder widget if cursor is outside)

| Header 1 | Header 2 |
|----------|----------|
| Cell 1.1 | Cell 1.2 |
| Cell 2.1 | Cell 2.2 |

`;

const doc = ref(initialDoc);
const view = shallowRef<EditorView>();

const handleReady = (payload: { view: EditorView }) => {
    view.value = payload.view;
    console.log('CodeMirror view ready:', view.value);
};

const logChange = (value: string) => {
    // console.log('Changed:', value);
};
const logFocus = (event: FocusEvent) => {
    // console.log('Focus:', event);
};
const logBlur = (event: FocusEvent) => {
    // console.log('Blur:', event);
};

const theme = EditorView.theme({
    '&': {
        color: 'inherit', // Use Tailwind's text color from body
        backgroundColor: 'transparent', // Use Tailwind's bg color from wrapper
    },
    '.cm-content': {
        caretColor: '#0e99b0', // Example caret color
    },
    '&.cm-focused .cm-cursor': {
        borderLeftColor: '#0e99b0',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: '#0e99b030', // Example selection color
    },
    '.cm-gutters': {
        // backgroundColor: '#f5f5f5', // Use Tailwind CSS or a class instead
        // color: '#999',
        // border: 'none',
    },
}, { dark: document.documentElement.classList.contains('dark') }); // Basic dark mode detection


const extensions = [
    theme, // Custom theme override
    EditorState.tabSize.of(4),
    indentUnit.of("    "), // Or "  " for 2 spaces
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown({
        base: markdownLanguage, // Essential for @codemirror/lang-markdown
        codeLanguages: languages, // For syntax highlighting in GFM fenced code blocks
        // addKeymap: true, // Adds basic Markdown keybindings
        // defaultCodeLanguage: ... // if needed
        // extensions: [] // For Lezer grammar extensions for OFM later
    }),
    obsidianSyntaxHighlighting, // Our custom syntax highlighting styles
    obsidianRichEditPlugin,     // Hides markdown syntax
    obsidianRenderBlockPlugin(),// Renders certain blocks as widgets

    // Event handler to move cursor into block widgets on click (from codemirror-rich-markdoc)
    EditorView.domEventHandlers({
        mousedown(event, view) {
            const target = event.target as Element;
            // Check if the click is on our rendered block or its children
            if (target.matches('.cm-rendered-block, .cm-rendered-block *')) {
                // Find the closest parent that is the widget root
                const widgetRoot = target.closest('.cm-rendered-block');
                if (widgetRoot) {
                    const pos = view.posAtDOM(widgetRoot);
                    if (pos !== null) {
                        view.dispatch({
                            selection: { anchor: pos, head: pos }, // Place cursor at the start of the block
                            // userEvent: "select" // You can add userEvent for tracking
                        });
                        // It can be good to focus the editor too if it wasn't
                        view.focus();
                        return true; // Indicate we handled the event
                    }
                }
            }
            return false; // Let CodeMirror handle it
        }
    })
];

onMounted(() => {
    // You can programmatically update the doc if needed
    // doc.value = "New content loaded!";
});

</script>

<style>
/* Additional global styles for CodeMirror can go here or in tailwind.css */
/* For Tailwind v4, you might prefer plugin system or variant for .dark */
.dark .cm-editor .cm-gutters {
    background-color: #2d3748; /* Example dark gutter */
    border-right-color: #4a5568;
}

/* Ensure Tailwind styles take precedence if needed, or style via HighlightStyle classes */
.cm-editor .cm-link { /* Tailwind's 'underline' might be overridden by CM default */
    text-decoration: underline;
}

/* Example of targeting specific tokens with Tailwind-like classes via HighlightStyle */
/* .cm-editor .font-bold { ... } /* This would be applied via HighlightStyle */
</style>