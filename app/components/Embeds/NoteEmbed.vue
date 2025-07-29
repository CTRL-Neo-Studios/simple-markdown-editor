<template>
    <div class="p-4 border rounded-lg bg-gray-100 dark:bg-gray-800">
        <h3 class="font-bold">{{ linkData.internalLinkName }}</h3>
        <p>This is a custom embed for a note.</p>
        <p class="text-sm text-gray-500">Redirects to: {{ linkData.redirectToPath }}</p>
    </div>
</template>

<script setup lang="ts">
import type { InternalLink } from '~/utils/codemirror-rich-markdoc/config';

defineProps<{
    linkData: InternalLink;
}>();
</script> 