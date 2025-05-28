import { Decoration, WidgetType, EditorView } from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
// import remarkParse from 'remark-parse'; // For later when we parse markdown
// import remarkRehype from 'remark-rehype'; // For later
// import rehypeStringify from 'rehype-stringify'; // For later
// import { unified } from 'unified'; // For later

import type { DecorationSet } from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';

// Placeholder for actual config/parser we might need
interface ObsidianRenderConfig {
    // Potentially for custom renderers or parsers in the future
}

class RenderedBlockWidget extends WidgetType {
    source: string;
    html: string;

    constructor(source: string, _config: ObsidianRenderConfig) {
        super();
        this.source = source;
        // In a real scenario, parse markdown (this.source) to HTML here
        // For now, just display the source in a styled div
        // const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeStringify);
        // this.html = String(processor.processSync(source));
        this.html = `<pre class="text-xs p-2 bg-gray-100 border rounded">${source.replace(/</g, '&lt;')}</pre><p class="text-sm text-gray-500">(Block Widget Placeholder)</p>`;
    }

    override eq(other: RenderedBlockWidget): boolean {
        return other.source === this.source;
    }

    toDOM(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('contenteditable', 'false'); // CRITICAL
        wrapper.className = 'cm-rendered-block my-2 p-3 border rounded bg-slate-50 dark:bg-slate-800';
        wrapper.innerHTML = this.html; // In real use, this would be the rendered HTML
        return wrapper;
    }

    override ignoreEvent(): boolean {
        // True means CodeMirror handles it, false means widget handles it
        // For a non-editable block, true is often fine unless you have interactive elements
        return true;
    }
}

function computeRenderedBlocks(state: EditorState, config: ObsidianRenderConfig) {
    const decorations: Range<Decoration>[] = [];
    const [cursor] = state.selection.ranges;

    syntaxTree(state).iterate({
        enter: (node) => {
            // Example: Identify tables or fenced code blocks to be replaced by widgets
            // We'd need to add more sophisticated logic for OFM blocks like callouts or embeds
            const isBlockToRender = node.name === 'Table' || node.name === 'FencedCode'; // Add more types like 'Image' for embeds

            if (isBlockToRender) {
                // IMPORTANT: Only render if the cursor is NOT inside this block
                if (cursor.from < node.from || cursor.to > node.to) {
                    const sourceText = state.doc.sliceString(node.from, node.to);
                    const decoration = Decoration.replace({
                        widget: new RenderedBlockWidget(sourceText, config),
                        block: true, // Make it a block widget
                    });
                    decorations.push(decoration.range(node.from, node.to));
                    return false; // Don't iterate into children of a replaced block
                }
            }
        },
    });
    return RangeSet.of(decorations, true);
}

export function obsidianRenderBlockPlugin(config: ObsidianRenderConfig = {}) {
    return StateField.define<DecorationSet>({
        create(state) {
            return computeRenderedBlocks(state, config);
        },
        update(value, transaction) {
            if (transaction.docChanged || transaction.selection) {
                return computeRenderedBlocks(transaction.state, config);
            }
            return value; // No change, return old value
        },
        provide(field) {
            return EditorView.decorations.from(field);
        },
    });
}