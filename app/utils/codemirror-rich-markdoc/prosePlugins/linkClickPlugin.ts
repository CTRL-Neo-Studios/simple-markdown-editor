import {EditorView, type PluginValue, ViewPlugin} from "@codemirror/view";

class LinkClickHandler implements PluginValue {
    constructor(private view: EditorView) {
        this.view.dom.addEventListener("mousedown", this.handleClick);
    }

    destroy() {
        this.view.dom.removeEventListener("mousedown", this.handleClick);
    }

    private handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'A') {
            const isInternal = target.dataset.internalLink === 'true';

            if (isInternal) {
                event.preventDefault();
                event.stopPropagation();
                this.view.dom.dispatchEvent(new CustomEvent('internal-link-click', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        path: target.dataset.path,
                        subpath: target.dataset.subpath,
                        display: target.dataset.display,
                    },
                }));
            }
        }
    }
}

export const linkClickPlugin = ViewPlugin.fromClass(LinkClickHandler); 