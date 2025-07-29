import { WidgetType } from '@codemirror/view';

export class ImageEmbedWidget extends WidgetType {
    constructor(readonly src: string, readonly pos: number, readonly selectionFrom?: number, readonly selectionTo?: number) {
        super();
    }

    toDOM() {
        const container = document.createElement('div');
        container.className = 'internal-embed media-embed image-embed is-loaded';
        container.tabIndex = -1;
        container.contentEditable = 'false';
        container.dataset.embedPos = String(this.pos);

        if (this.selectionFrom !== undefined && this.selectionTo !== undefined) {
            container.dataset.selectionFrom = String(this.selectionFrom);
            container.dataset.selectionTo = String(this.selectionTo);
        }

        const img = document.createElement('img');
        img.src = this.src;

        container.appendChild(img);
        return container;
    }

    override ignoreEvent(event: Event): boolean {
        // Allow mousedown events to be handled by our plugin
        return !(event instanceof MouseEvent && event.type === 'mousedown');
    }
} 