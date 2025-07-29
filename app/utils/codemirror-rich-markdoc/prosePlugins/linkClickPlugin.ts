import {EditorView} from "@codemirror/view";

export const linkClickPlugin = EditorView.domEventHandlers({
    mousedown(event, view) {
        const anchor = (event.target as HTMLElement).closest('a.cm-link') as HTMLAnchorElement;

        if (!anchor) {
            return false; // Not a link, let CM handle it.
        }

        if (anchor.dataset.internalLink === 'true') {
            event.preventDefault(); // Prevent navigation to '#'
            view.dom.dispatchEvent(new CustomEvent('internal-link-click', {
                bubbles: true,
                composed: true,
                detail: {
                    path: anchor.dataset.path,
                    subpath: anchor.dataset.subpath,
                    display: anchor.dataset.display,
                },
            }));
        } else if (anchor.dataset.externalLink === 'true') {
            event.preventDefault();
            view.dom.dispatchEvent(new CustomEvent('external-link-click', {
                bubbles: true,
                composed: true,
                detail: {
                    url: anchor.dataset.url,
                    text: anchor.dataset.text
                }
            }));
        }
        
        // For both internal and external links, we want to tell CM that we've handled it
        // so it doesn't try to move the cursor.
        return true;
    },
}); 