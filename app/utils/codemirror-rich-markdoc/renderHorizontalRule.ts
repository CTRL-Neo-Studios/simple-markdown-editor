import {Decoration, WidgetType, EditorView, type DecorationSet} from '@codemirror/view';
import { RangeSet, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';
import {USeparator} from "#components"; // Renamed Range to EditorRange to avoid conflict

class HorizontalRuleWidget extends WidgetType {
    toDOM(): HTMLElement {
        const div = document.createElement('div')
        div.append(document.createElement('hr'));
        div.className = 'prose-cm-hr-widget';
        return div;
    }

    override eq(): boolean {
        // All instances of this widget are considered the same
        return true;
    }

    // An HR is simple; clicks near it should reveal the source.
    // Returning false means events are handled by CodeMirror, allowing cursor placement.
    override ignoreEvent(): boolean {
        return false;
    }
}

const hrWidget = new HorizontalRuleWidget(); // Create a single instance

function buildHrDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];
    const [selectionRange] = state.selection.ranges; // Get the primary selection range

    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'HorizontalRule') {
                // Get the line numbers for the start and end of the HorizontalRule node
                const ruleLineStart = state.doc.lineAt(node.from).number;
                const ruleLineEnd = state.doc.lineAt(node.to).number;

                // Get the line number for the cursor's anchor and head
                const cursorLineAnchor = state.doc.lineAt(selectionRange?.anchor).number;
                const cursorLineHead = state.doc.lineAt(selectionRange?.head).number;

                // Check if the cursor (either anchor or head) is on the same line(s) as the rule
                // This handles multi-line selections potentially spanning the rule.
                const cursorOnRuleLine =
                    (cursorLineAnchor >= ruleLineStart && cursorLineAnchor <= ruleLineEnd) ||
                    (cursorLineHead >= ruleLineStart && cursorLineHead <= ruleLineEnd) ||
                    (cursorLineAnchor < ruleLineStart && cursorLineHead > ruleLineEnd) || // Selection spans across the rule
                    (cursorLineHead < ruleLineStart && cursorLineAnchor > ruleLineEnd);   // Selection spans across the rule (reversed)


                if (!cursorOnRuleLine) {
                    // If cursor is not on the rule's line(s), replace the node with the widget
                    decorations.push(
                        Decoration.replace({
                            widget: hrWidget,
                            block: true, // Ensures it takes up its own line
                        }).range(node.from, node.to)
                    );
                }
                return false; // Don't iterate further into the HorizontalRule node
            }
        },
    });
    return decorations;
}

export const horizontalRulePlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildHrDecorations(state));
    },
    update(value, tr) {
        // Recompute if document changed or selection changed (to show/hide widget)
        if (tr.docChanged || tr.selection) {
            return RangeSet.of(buildHrDecorations(tr.state));
        }
        // Otherwise, just map existing decorations through changes
        return value.map(tr.changes);
    },
    provide: (f) => EditorView.decorations.from(f),
});