<template>
    <div :class="props.class ? props.class : 'w-full h-full'" ref="editorEl">
        <ClientOnly>
            <div class="w-full">
                <CodeMirror
                    v-model="doc"
                    placeholder="Start typing your markdown content here..."
                    :autofocus="true"
                    :indent-with-tab="true"
                    :tab-size="4"
                    :extensions="extensions"
                    @ready="handleReady"
                    @change="log('change', $event)"
                    @focus="log('focus', $event)"
                    @blur="log('blur', $event)"
                    class="w-full h-full"
                />
            </div>
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">
import CodeMirror from 'vue-codemirror6';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import type { Config as MarkdocConfig } from '@markdoc/markdoc';
import {languages} from '@codemirror/language-data';
import {syntaxTree} from "@codemirror/language";

import richMarkdocPlugin from '~/utils/codemirror-rich-markdoc';
import {drawSelection, EditorView, highlightActiveLine, keymap, rectangularSelection} from "@codemirror/view";
import markdocConfig from "~/utils/codemirror-rich-markdoc/markdocConfig";
import {defaultKeymap, history, historyKeymap, indentWithTab} from "@codemirror/commands";
import {defaultHighlightStyle, indentOnInput, syntaxHighlighting} from "@codemirror/language";
import {horizontalRulePlugin} from "~/utils/codemirror-rich-markdoc/renderHorizontalRule";
import {lineStylingPlugin} from "~/utils/codemirror-rich-markdoc/lineStyling";
import {codeBlockStylePlugin} from "~/utils/codemirror-rich-markdoc/codeBlockStylePlugin";
import {proseAlwaysHiddenPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseAlwaysHiddenPlugin";
import {proseMarkdocTagPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseMarkdocTagPlugin";
import {proseToggleableMarksPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseToggleableMarksPlugins";
import {proseListMarkPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseListMarkPlugin";
import {proseIndentPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseIndentPlugin";
import {proseInternalLinkPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseInternalLinkPlugin";
import {proseLinkPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseLinkPlugin";
import {proseHashtagWrapperPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseHashtagWrapperPlugin";
import {proseExpCalloutPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseExpCalloutPlugin";
import {calloutRenderField} from "~/utils/codemirror-rich-markdoc/prosePlugins/calloutRenderField";
import {linkClickPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/linkClickPlugin";
// import {proseListStylingPlugin} from "~/utils/codemirror-rich-markdoc/prosePlugins/proseListStylingPlugin";

const props = defineProps<{class?: string}>()
const emit = defineEmits(['internal-link-click', 'external-link-click']);

const doc = defineModel<string>();

const extensions = shallowRef<any[]>([]);
const view = shallowRef<EditorView>();
const editorEl = ref<HTMLElement>();

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
        proseIndentPlugin,
        proseInternalLinkPlugin,
        proseLinkPlugin,
        proseHashtagWrapperPlugin,
        proseExpCalloutPlugin,
        calloutRenderField,
        linkClickPlugin,

        richPluginInstance,

        history(),
        drawSelection(),
        rectangularSelection(),
        // highlightActiveLine(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    ];

    if (editorEl.value) {
        editorEl.value.addEventListener('internal-link-click', handleInternalLinkClick as EventListener);
        editorEl.value.addEventListener('external-link-click', handleExternalLinkClick as EventListener);
    }
});

onBeforeUnmount(() => {
    if (editorEl.value) {
        editorEl.value.removeEventListener('internal-link-click', handleInternalLinkClick as EventListener);
        editorEl.value.removeEventListener('external-link-click', handleExternalLinkClick as EventListener);
    }
});

const handleInternalLinkClick = (event: CustomEvent) => {
    emit('internal-link-click', event.detail);
};

const handleExternalLinkClick = (event: CustomEvent) => {
    emit('external-link-click', event.detail);
};
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

.cm-link {
    cursor: pointer;
}
</style>