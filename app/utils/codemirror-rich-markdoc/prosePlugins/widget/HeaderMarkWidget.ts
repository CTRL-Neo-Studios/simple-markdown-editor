// ~/utils/codemirror-rich-markdoc/prosePlugins/widgets/HeaderMarkWidget.ts
import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';

export class HeaderMarkWidget extends WidgetType {
    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        // Setting contenteditable to false is common for widgets that replace editable text
        // to prevent direct editing of the widget's placeholder.
        span.setAttribute('contenteditable', 'false');
        // You can give it a class for debugging or if you need any minimal CSS,
        // but often an empty span is enough to make the original text disappear.
        // span.className = 'cm-header-mark-replacement';
        return span;
    }

    override eq(other: HeaderMarkWidget): boolean {
        return true; // All instances are essentially the same
    }

    //ignoreEvent is important for how CodeMirror handles clicks on/near the widget.
    // Returning false generally means CodeMirror will handle the event, which often
    // means a click near or "on" the widget (if it has no interactive elements itself)
    // will place the cursor, potentially making the parent node "active" and revealing the source.
    override ignoreEvent(event: Event): boolean {
        return false;
    }
}