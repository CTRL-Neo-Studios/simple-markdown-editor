<script setup lang="ts">
import SimpleEditorMarkdocMarkdown from "~/components/Simple/Editor/MarkdocMarkdown.vue";

const doc = ref(`
# This is a test document

Here is an external link: [Google](https://www.google.com)

Here is an internal link: [[My Note]]

Here is another internal link with an alias: [[Another Note|Click Here]]
`);

const internalLinkMap = ref({
    "My Note": "/notes/my-note",
    "Another Note": "/notes/another-note",
});

const router = useRouter();
const handleInternalLinkClick = (detail: { path: string, subpath?: string, display?: string }) => {
    const url = internalLinkMap.value[detail.path as keyof typeof internalLinkMap.value];
    if (url) {
        router.push(url);
    }
};
</script>

<template>
    <div class="w-screen h-screen">
        <SimpleEditorMarkdocMarkdown v-model="doc" :internal-link-map="internalLinkMap" @internal-link-click="handleInternalLinkClick"/>
    </div>
</template>
