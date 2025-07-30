<template>
  <div class="callout-embed" :data-callout-type="calloutType" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MarkdownIt from 'markdown-it';
import markdownItObsidianCallouts from 'markdown-it-obsidian-callouts';

const props = defineProps<{
  content: string;
}>();

const md = new MarkdownIt({ html: true }).use(markdownItObsidianCallouts);

const renderedContent = ref('');
const calloutType = ref('note');

const renderMarkdown = () => {
  const html = md.render(props.content);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const calloutEl = tempDiv.querySelector('.callout');
  if (calloutEl) {
    calloutType.value = calloutEl.getAttribute('data-callout') || 'note';
    
    const foldEl = calloutEl.querySelector('.callout-fold');
    if (foldEl) {
      foldEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left-icon lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>`;
    }
  }
  
  renderedContent.value = calloutEl ? calloutEl.innerHTML : 'Error rendering callout';
};

onMounted(() => {
  renderMarkdown();
});
</script>

<style scoped>
.callout-embed {
  padding: 1rem;
  border-left: 5px solid;
  border-radius: 5px;
  margin: 1rem 0;
}
.callout-embed[data-callout-type="note"] {
  border-left-color: #448aff;
  background-color: rgba(68, 138, 255, 0.1);
}
.callout-embed[data-callout-type="tip"] {
  border-left-color: #00bfa5;
  background-color: rgba(0, 191, 165, 0.1);
}
.callout-embed[data-callout-type="warning"] {
    border-left-color: #ff9100;
    background-color: rgba(255, 145, 0, 0.1);
}
.callout-embed[data-callout-type="error"] {
    border-left-color: #ff5252;
    background-color: rgba(255, 82, 82, 0.1);
}
</style>
