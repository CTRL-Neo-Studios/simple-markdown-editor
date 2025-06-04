import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import type { EditorState, Range as EditorRange } from '@codemirror/state';

function buildIndentDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];

    for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
        const line = state.doc.line(lineNum);
        const lineText = line.text;

        // Detect indentation at the start of the line
        const indentMatch = lineText.match(/^(\s+)/);
        if (indentMatch) {
            const indentText = indentMatch[1];
            const indentLength = indentText.length;

            // Create indent spans for every 2 or 4 spaces (configurable)
            const spacesPerIndent = 2; // Obsidian uses 2 spaces per indent
            const indentLevels = Math.floor(indentLength / spacesPerIndent);

            if (indentLevels > 0) {
                let currentPos = line.from;

                // Add wrapper for all indents on this line
                decorations.push(
                    Decoration.mark({
                        class: `cm-hmd-list-indent cm-hmd-list-indent-${indentLevels}`,
                        tagName: 'span'
                    }).range(line.from, line.from + indentLength)
                );

                // Add individual indent spans
                for (let i = 0; i < indentLevels; i++) {
                    const spanEnd = Math.min(currentPos + spacesPerIndent, line.from + indentLength);

                    decorations.push(
                        Decoration.mark({
                            class: 'cm-indent',
                            tagName: 'span',
                            attributes: { 'data-indent-level': i.toString() }
                        }).range(currentPos, spanEnd)
                    );

                    currentPos = spanEnd;
                }
            }
        }
    }

    return decorations;
}

export const proseIndentPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildIndentDecorations(state));
    },
    update(value, tr) {
        if (tr.docChanged) {
            return RangeSet.of(buildIndentDecorations(tr.state));
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});