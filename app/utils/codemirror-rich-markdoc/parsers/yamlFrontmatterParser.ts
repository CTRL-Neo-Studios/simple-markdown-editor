import type { Input } from "@lezer/common"; // Added import
import type { MarkdownConfig, BlockContext, Line } from '@lezer/markdown';
import {Tag} from "@lezer/highlight";

export const yamlFrontmatter = Tag.define('YAMLFrontMatter');
export const yamlMarker = Tag.define('YAMLMarker');
export const yamlContent = Tag.define('YAMLContent');

// This extends the BlockContext type for TypeScript. Place it here or in a global .d.ts file.
declare module "@lezer/markdown" {
    interface BlockContext {
        readonly input: Input; // Make sure this exists or adjust as per your Lezer version
        checkedYaml?: boolean | null; // Optional for safety, initialize in parse
    }
}

export const yamlFrontmatterParser: MarkdownConfig = {
    defineNodes: [
        {name: "YAMLFrontMatter", style: yamlFrontmatter},
        {name: "YAMLMarker", style: yamlMarker},
        {name: "YAMLContent", style: yamlContent}
    ],
    parseBlock: [
        {
            name: "YAMLFrontMatter",
            parse(cx: BlockContext, line: Line) {
                // Ensure checkedYaml exists on cx
                if (!Object.prototype.hasOwnProperty.call(cx, 'checkedYaml')) {
                    (cx as any).checkedYaml = null; // Initialize if not present
                }

                if (cx.checkedYaml || cx.lineStart !== 0) { // Only parse at the very beginning of the doc
                    return false;
                }
                cx.checkedYaml = true; // Mark as checked for this parse run

                // Check for opening '---'
                if (line.text.slice(line.pos) !== "---") {
                    return false;
                }

                const start = cx.lineStart + line.pos; // Start of opening '---'
                const markers: any[] = [cx.elt("YAMLMarker", start, start + 3)];
                let contentStart = -1;
                let contentEnd = -1;
                let end = -1;

                // Read lines until closing '---' or '...'
                while (cx.nextLine()) {
                    if (contentStart === -1) contentStart = cx.lineStart; // First line after opening '---'

                    const lineText = line.text.slice(line.pos);
                    if (lineText === "---" || lineText === "...") {
                        contentEnd = cx.lineStart -1; // Previous line end
                        if (contentStart > contentEnd && contentStart !== -1) contentEnd = contentStart; // Handle empty content

                        end = cx.lineStart + line.pos + 3; // End of closing '---' or '...'
                        markers.push(cx.elt("YAMLMarker", cx.lineStart + line.pos, end));
                        cx.nextLine(); // Consume the closing marker line
                        break;
                    }
                }

                if (end === -1) return false; // No closing marker found

                if (contentStart !== -1 && contentEnd !== -1 && contentStart <= contentEnd) {
                    markers.splice(1, 0, cx.elt("YAMLContent", contentStart, contentEnd));
                } else if (contentStart !== -1 && contentEnd === -1) { // If file ends before closing marker
                    contentEnd = cx.docLen; // parse till end of document
                    markers.splice(1, 0, cx.elt("YAMLContent", contentStart, contentEnd));
                }


                cx.addElement(cx.elt("YAMLFrontMatter", start, end, markers));
                return true;
            },
            before: "LinkReference", // Or very early like "Blockquote"
        },
    ],
};
