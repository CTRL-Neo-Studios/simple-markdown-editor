<template>
    <div :class="props.class ? props.class : 'w-full h-full'">
        <ClientOnly>
            <CodeMirror
                v-model="doc"
                placeholder="Start typing your markdown content here..."
                :autofocus="true"
                :indent-with-tab="true"
                :tab-size="2"
                :extensions="extensions"
                @ready="handleReady"
                @change="log('change', $event)"
                @focus="log('focus', $event)"
                @blur="log('blur', $event)"
                class="w-full h-full"
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
import {GFM, Subscript, Superscript, Emoji, Table, TaskList, Autolink, Strikethrough} from '@lezer/markdown';

import richMarkdocPlugin from '~/utils/codemirror-rich-markdoc';
import {drawSelection, EditorView, highlightActiveLine, keymap, rectangularSelection} from "@codemirror/view";
import markdocConfig from "~/utils/codemirror-rich-markdoc/markdocConfig";
import {defaultKeymap, history, historyKeymap, indentWithTab} from "@codemirror/commands";
import {defaultHighlightStyle, indentOnInput, syntaxHighlighting} from "@codemirror/language";
import highlightStyle from "~/utils/codemirror-rich-markdoc/highlightStyle";
import {horizontalRulePlugin} from "~/utils/codemirror-rich-markdoc/renderHorizontalRule";
import {headingRenderPlugin} from "~/utils/codemirror-rich-markdoc/renderHeading";
import {lineStylingPlugin} from "~/utils/codemirror-rich-markdoc/lineStyling";
import {codeBlockStylePlugin} from "~/utils/codemirror-rich-markdoc/codeBlockStylePlugin";
import {clickRevealOnMouseUpPlugin} from "~/utils/codemirror-rich-markdoc/clickRevealOnMouseUp";
import {proseAlwaysHiddenPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseAlwaysHiddenPlugin";
import {proseMarkdocTagPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseMarkdocTagPlugin";
import {proseToggleableMarksPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseToggleableMarksPlugins";
import {proseListMarkPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseListMarkPlugin";
import {proseIndentPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseIndentPlugin";
import {proseInternalLinkPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseInternalLinkPlugin";
// import {proseListStylingPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseListStylingPlugin";

const props = defineProps<{class?: string}>()

const doc = ref(``);

const extensions = shallowRef<any[]>([]);
const view = shallowRef<EditorView>();

const handleReady = (payload: any) => {
    view.value = payload.view;
};

const log = (...args: any) => {
    // console.log(...args);
};

onMounted(() => {
    // The richMarkdocPlugin is a function that returns the actual CodeMirror ViewPlugin
    // It also provides other extensions like markdown() and syntaxHighlighting()
    const richPluginInstance = richMarkdocPlugin({
        markdoc: markdocConfig,
        lezer: {
            codeLanguages: languages,
            extensions: [],
        }
    });

    extensions.value = [
        EditorView.lineWrapping,
        horizontalRulePlugin,
        lineStylingPlugin,
        codeBlockStylePlugin,
        proseAlwaysHiddenPlugin,
        proseMarkdocTagPlugin,
        proseToggleableMarksPlugin,
        proseListMarkPlugin,
        // proseListStylingPlugin,
        proseIndentPlugin,
        proseInternalLinkPlugin,

        richPluginInstance,

        history(),
        drawSelection(),
        rectangularSelection(),
        // highlightActiveLine(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    ];
});

function iterate() {
    view.value?.state?.tree.iterate({
        from: 0,
        to: view.value.state.doc.length,
        enter(node) {
            console.log(
                `Node: ${node.name}, From: ${node.from}, To: ${node.to}, Text: "${view.value?.state.doc.sliceString(node.from, node.to)}"`
            );
            // To see highlight tags (more advanced, may need to inspect CM internals or a debug extension)
            // For now, node.name is the most critical.
        }
    });
}

</script>

<style>
@reference "~/assets/css/main.css";

.codemirror-container {
    @apply w-full h-full;
}

div[contenteditable='true']:focus {
    @apply outline-none border-none h-full shadow-none;
}

.cm-focused {
    @apply outline-none!;
}

.cm-placeholder {
    @apply font-sans text-sm text-muted;
}

.cm-activeLine {
    @apply bg-transparent!;
}

.cm-selectionBackground {
    @apply bg-primary/50! z-20;
}
</style>