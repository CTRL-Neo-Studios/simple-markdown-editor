<script setup lang="ts">
import SimpleEditorMarkdocMarkdown from "~/components/Simple/Editor/MarkdocMarkdown.vue";

const doc = ref(`
# This is a test document

Here is an external link: [Google](https://www.google.com)

Here is an internal link: [[My Note]]

Here is an embed: ![[Another Note]]
`);

interface InternalLinkMap {
    internalLinkName: string;
    filePath?: string;
    redirectToPath: string;
}

const internalLinkMap = ref<InternalLinkMap[]>([
    {
        internalLinkName: "My Note",
        redirectToPath: "/notes/my-note",
    },
    {
        internalLinkName: "Another Note",
        filePath: "/path/to/another/note.md",
        redirectToPath: "/notes/another-note",
    },
]);

const router = useRouter();

const handleInternalLinkClick = (detail: { path: string, subpath?: string, display?: string, type: 'internal-link' | 'embed' }) => {
    console.log("Internal link clicked:", detail);
    const link = internalLinkMap.value.find(l => l.internalLinkName === detail.path);
    if (link) {
        router.push(link.redirectToPath);
    }
};

const handleExternalLinkClick = (detail: { url: string, text?: string }) => {
    if (detail.url) {
        window.open(detail.url, '_blank');
    }
};
</script>

<template>
    <div class="w-screen h-screen">
        <SimpleEditorMarkdocMarkdown v-model="doc" @internal-link-click="handleInternalLinkClick" @external-link-click="handleExternalLinkClick"/>
    </div>
</template>
