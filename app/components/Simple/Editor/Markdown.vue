<template>
    <div class="obsidian-editor-container">
        <CodeMirror
            v-model="content"
            :extensions="extensions"
            :style="{ height: '100vh' }"
            class="bg-none"
            @ready="handleReady"
        />
    </div>
</template>

<script setup lang="ts">
import CodeMirror from 'vue-codemirror6'
import {useCodeMirror} from "~/composables/cm6/useCodeMirror";

const { content, extensions, view } = useCodeMirror()

// Set initial content
content.value = `# Welcome to Obsidian Editor

This is a **bold** text and this is *italic*.

Here's an internal link: [[My Note]]

Some ==highlighted text== for you.

## Code Block

\`\`\`javascript
console.log('Hello World!')
\`\`\`

## Task List

- [ ] Incomplete task
- [x] Completed task

## Table

| Feature | Status |
|---------|--------|
| Links   | ✅     |
| Tables  | ✅     |
`

function handleReady(payload: { view: any }) {
    view.value = payload.view
}
</script>

<style>
@reference "~/assets/css/main.css";

/* Obsidian-inspired CSS variables */
:root {
    --text-normal: var(--text-color-default);
    --text-muted: var(--text-color-muted);
    --text-accent: var(--text-color-toned);
    --text-highlight-bg: var(--text-color-highlighted);
    --background-primary: var(--ui-bg);
    --background-secondary: var(--ui-bg-accented);
    --background-modifier-border: var(--ui-bg-muted);
    --font-text: var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-monospace: "JetBrains Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
}

/* Obsidian-inspired CSS variables */

.obsidian-editor-container {
    @apply bg-default font-sans;
}

/* Additional Obsidian-like styling */
.cm-editor.cm-focused {
    outline: none;
}

.cm-activeLine {
    background-color: var(--background-modifier-border);
}

.cm-selectionBackground {
    background: var(--text-accent) !important;
    opacity: 0.3;
}

/* Task list styling */
.cm-line:has(.task-list-item) {
    list-style: none;
}

/* Table styling */
table {
    border-collapse: collapse;
    margin: 1em 0;
}

table th,
table td {
    border: 1px solid var(--background-modifier-border);
    padding: 8px 12px;
    text-align: left;
}

table th {
    background: var(--background-secondary);
    font-weight: 600;
}
</style>