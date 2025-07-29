<template>
    <img :src="filePath" class="w-full h-auto" alt="Embedded Image"/>
</template>

<script setup lang="ts">
defineProps<{
    filePath: string;
}>();
</script> 