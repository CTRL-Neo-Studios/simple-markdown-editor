<script setup lang="ts">
import SimpleEditorMarkdocMarkdown from "~/components/Simple/Editor/MarkdocMarkdown.vue";
import type {InternalLink} from "~/utils/codemirror-rich-markdoc/config";

const doc = ref(`
# This is a test document

Here is an external link: [Google](https://www.google.com)

Here is an internal link: [[My Note]]

Here is an image embed: ![[Kthalatir.png]]

Here is a note embed: ![[Another Note]]

And here is a standard markdown image: ![picsum](https://picsum.photos/400/200)
`);

const internalLinkMap = ref<InternalLink[]>([
    {
        internalLinkName: "My Note",
        redirectToPath: "/notes/my-note",
    },
    {
        internalLinkName: "Another Note",
        redirectToPath: "/notes/another-note",
    },
    {
        internalLinkName: "Kthalatir.png",
        filePath: "/Kthalatir.png",
        redirectToPath: "/images/kthalatir",
    }
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
        <SimpleEditorMarkdocMarkdown v-model="doc" :internal-link-map="internalLinkMap" @internal-link-click="handleInternalLinkClick" @external-link-click="handleExternalLinkClick"/>
    </div>
</template>
