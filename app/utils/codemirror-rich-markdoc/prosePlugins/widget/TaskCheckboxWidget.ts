import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';

export class TaskCheckboxWidget extends WidgetType {
    constructor(private checked: boolean, private pos: number) {
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
        checkbox.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Toggle the checkbox state
            const newValue = this.checked ? '[ ]' : '[x]';

            view.dispatch({
                changes: { from: this.pos, to: this.pos + 3, insert: newValue }
            });
        };

        label.appendChild(checkbox);
        return label;
    }

    override eq(other: TaskCheckboxWidget): boolean {
        return other.checked === this.checked && other.pos === this.pos;
    }

    override ignoreEvent(event: Event): boolean {
        // Handle click and mousedown events on the checkbox
        return event.type === 'mousedown' || event.type === 'click';
    }
}