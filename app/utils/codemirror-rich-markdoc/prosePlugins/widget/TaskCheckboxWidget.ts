// ~/utils/codemirror-rich-markdoc/prosePlugins/widgets/TaskCheckboxWidget.ts
import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';

export class TaskCheckboxWidget extends WidgetType {
    constructor(private checked: boolean) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const label = document.createElement('label');
        label.className = 'task-list-label';
        label.setAttribute('contenteditable', 'false');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-list-item-checkbox';
        checkbox.checked = this.checked;
        checkbox.setAttribute('data-task', this.checked ? 'X' : ' ');

        // Handle checkbox clicks
        checkbox.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Find the widget's position in the document
            const pos = view.posAtDOM(label);
            if (pos !== null) {
                // Find the line and locate the task marker
                const line = view.state.doc.lineAt(pos);
                const lineText = line.text;

                // Look for the task marker pattern: - [ ] or - [X]
                const taskMatch = lineText.match(/^(\s*[-*+]\s+)\[([Xx ])\]/);

                if (taskMatch) {
                    const prefixLength = taskMatch[1]?.length || 0;
                    const checkboxStart = line.from + prefixLength + 1; // +1 to skip the '['
                    const checkboxEnd = checkboxStart + 1; // Just the character inside brackets

                    // Toggle the checkbox
                    const currentChar = taskMatch[2];
                    const newChar = (currentChar === ' ') ? 'X' : ' ';

                    view.dispatch({
                        changes: {
                            from: checkboxStart,
                            to: checkboxEnd,
                            insert: newChar
                        }
                    });
                }
            }
        };

        label.appendChild(checkbox);
        return label;
    }

    override eq(other: TaskCheckboxWidget): boolean {
        return other.checked === this.checked;
    }

    override ignoreEvent(event: Event): boolean {
        // Only handle our own click events, let other events through
        return event.type === 'click' && event.target instanceof HTMLInputElement;
    }
}