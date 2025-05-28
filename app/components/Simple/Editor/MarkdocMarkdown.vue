<template>
    <div class="editor-container">
        <ClientOnly>
            <CodeMirror
                v-model="doc"
                placeholder="Start typing your Markdoc content here..."
                :style="{ height: '600px', width: '100%', border: '1px solid #ccc' }"
                :autofocus="true"
                :indent-with-tab="true"
                :tab-size="2"
                :extensions="extensions"
                @ready="handleReady"
                @change="log('change', $event)"
                @focus="log('focus', $event)"
                @blur="log('blur', $event)"
            />
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import type { Config as MarkdocConfig } from '@markdoc/markdoc';
import { languages } from '@codemirror/language-data';
import { Table } from '@lezer/markdown';

// Import the plugin from your lib directory
import richMarkdocPlugin from '~/utils/codemirror-rich-markdoc';
import {drawSelection, EditorView, highlightActiveLine, keymap, rectangularSelection} from "@codemirror/view";
import markdocConfig from "~/utils/codemirror-rich-markdoc/markdocConfig";
import {defaultKeymap, history, historyKeymap, indentWithTab} from "@codemirror/commands";
import {defaultHighlightStyle, indentOnInput, syntaxHighlighting} from "@codemirror/language"; // Nuxt uses ~ for srcDir

const doc = ref(`# Welcome to Rich Markdoc Editor!

This is a paragraph.

{% callout type="note" title="A Note" %}
This is a callout block rendered by Markdoc.
{% /callout %}

## Features

*   **Bold text** and *italic text*.
*   [Links](https://markdoc.dev)
*   \`inline code\`

\`\`\`markdown
// A fenced code block
function hello() {
  console.log("World!");
}
\`\`\`

> A blockquote, which should also be rendered if not focused.

{% table %}
* Header 1
* Header 2
---
* Cell 1.1
* Cell 1.2
---
* Cell 2.1
* Cell 2.2
{% /table %}

Try clicking in and out of the table or callout to see the WYSIWYG effect.
`);

const extensions = shallowRef<any[]>([]);
const view = shallowRef<EditorView>();

const handleReady = (payload: any) => {
    view.value = payload.view;
    // console.log('CodeMirror instance ready:', view.value);
};

const log = (...args: any) => {
    // console.log(...args);
};

// Define a basic Markdoc configuration
// This is crucial for the renderBlock.ts to work
// const markdocConfig: MarkdocConfig = {
//     tags: {
//         callout: {
//             render: 'CalloutComponent', // This would ideally map to a Vue component
//                                         // For now, Markdoc will render a div with attributes
//             attributes: {
//                 type: { type: String, default: 'note' },
//                 title: { type: String },
//             },
//             // For HTML rendering, you might need to define how it transforms
//             // For simplicity, Markdoc's default HTML renderer will create a div
//             // with class "callout" and attributes from the tag
//             // If you were using Markdoc.transform and Markdoc.renderers.html directly,
//             // you'd configure this more deeply. The plugin does this internally.
//         },
//         table: {
//             // Markdoc has built-in table support but this {% table %} syntax
//             // is specific to how the richtext plugin parses it as a MarkdocTag.
//             // We need to tell Markdoc how to render such a tag if it's not a native node.
//             // The `renderBlock.ts` uses Markdoc.parse and Markdoc.transform.
//             // For `MarkdocTag` type nodes, it effectively treats the content inside
//             // `{% %}` as a self-contained Markdoc document.
//             // The current `tagParser.ts` creates a 'MarkdocTag' node.
//             // `renderBlock.ts` then parses the content of this tag.
//             // So if content is `{% table %} ... {% /table %}`, it parses the inner `...`
//             // If Markdoc's core markdown parser handles tables (like GFM),
//             // they will be picked up as 'Table' nodes, not 'MarkdocTag'.
//             // The example `{% table %}` in `codemirror-rich-markdoc` seems to rely
//             // on this `MarkdocTag` mechanism.
//             render: 'div', // Generic rendering for now
//             attributes: {},
//         }
//     },
//     nodes: {
//         // If you had custom Markdoc nodes (e.g. extending paragraphs)
//         // They would be defined here.
//         // For standard markdown elements like heading, paragraph, list, codeblock, etc.,
//         // Markdoc has default handling.
//         // The plugin's `renderBlock` targets 'Table', 'Blockquote', 'MarkdocTag'.
//     },
//     // You can add variables, partials, functions if your Markdoc content uses them
// };

onMounted(() => {
    // The richMarkdocPlugin is a function that returns the actual CodeMirror ViewPlugin
    // It also provides other extensions like markdown() and syntaxHighlighting()
    const richPluginInstance = richMarkdocPlugin({
        markdoc: markdocConfig,
        lezer: {
            codeLanguages: languages,
            extensions: [Table]
        }
    });

    extensions.value = [
        richPluginInstance,
        EditorView.lineWrapping,
        history(),
        drawSelection(),
        rectangularSelection(),
        highlightActiveLine(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    ];
});

</script>

<style>

</style>