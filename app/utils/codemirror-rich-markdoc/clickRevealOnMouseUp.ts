import { EditorView } from '@codemirror/view';
import type { PluginValue } from '@codemirror/view';

// This variable will store the intended selection position from mousedown.
let deferredSelectionPos: { anchor: number; head?: number } | null = null;

class ClickRevealController implements PluginValue {
    private view: EditorView;

    constructor(view: EditorView) {
        this.view = view;
        // We don't strictly need to do anything in constructor/update for this plugin type,
        // as domEventHandlers are processed by EditorView.
    }

    // destroy() { /* if we needed to clean up anything globally, unlikely here */ }
    // update(update: ViewUpdate) { /* if we needed to react to view updates */ }
}

export const clickRevealOnMouseUpPlugin = EditorView.domEventHandlers({
    mousedown(event, view) {
        const target = event.target as HTMLElement;

        // Get the CodeMirror position of the click
        const clickedPos = view.posAtDOM(target);
        if (clickedPos === null || clickedPos === undefined) { // Clicked outside of editable content or on something non-mappable
            deferredSelectionPos = null;
            return false; // Let CodeMirror handle (or ignore) as usual
        }

        const clickedLine = view.state.doc.lineAt(clickedPos);
        const currentSelection = view.state.selection.main;

        // Check if the cursor (a single, empty selection) is already on the line that was clicked.
        const cursorAlreadyOnClickedLine =
            currentSelection.empty &&
            currentSelection.from >= clickedLine.from &&
            currentSelection.to <= clickedLine.to;

        if (!cursorAlreadyOnClickedLine) {
            // If the cursor is NOT already on the clicked line (meaning this click would move it to a new line):
            // 1. Prevent CodeMirror's default mousedown behavior (which includes immediately moving the selection).
            event.preventDefault();
            // 2. Store the intended selection position.
            deferredSelectionPos = { anchor: clickedPos };

            // 3. Set up a one-time mouseup listener on the window.
            const onMouseUp = (mouseupEvent: MouseEvent) => {
                window.removeEventListener('mouseup', onMouseUp, true); // Clean up listener

                if (deferredSelectionPos) {
                    // Only dispatch the selection change if the mouseup event occurs
                    // within the CodeMirror content area. This prevents changing selection
                    // if the user mousedowns, drags outside the editor, and then mouseups.
                    if (view.contentDOM.contains(mouseupEvent.target as Node)) {
                        view.dispatch({
                            selection: deferredSelectionPos,
                            userEvent: 'select.pointer', // Good practice to tag user-initiated selections
                        });
                    }
                    deferredSelectionPos = null; // Clear the stored position
                }
            };
            window.addEventListener('mouseup', onMouseUp, true); // Use capture phase for broad listening

            return true; // Indicate that we've handled this mousedown event
        }

        // If the cursor IS already on the clicked line:
        // Let CodeMirror handle the mousedown normally. This allows normal interactions
        // within an already "active" line (e.g., moving the cursor within the line, starting a text selection).
        deferredSelectionPos = null;
        return false;
    },
});

// You might also want a an actual plugin to instantiate the class if you needed state within it,
// but for simple domEventHandlers, the object itself is often sufficient.
// If you prefer the class structure for consistency:
// export const clickRevealOnMouseUpPlugin = ViewPlugin.fromClass(ClickRevealController, {
//   eventHandlers: {
//     mousedown(...) { /* same logic */ }
//   }
// });