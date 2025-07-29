import { WidgetType } from '@codemirror/view';

export class ImageEmbedWidget extends WidgetType {
    constructor(readonly src: string) {
        super();
    }

    toDOM() {
        const container = document.createElement('div');
        container.className = 'internal-embed media-embed image-embed is-loaded';
        container.tabIndex = -1;
        container.contentEditable = 'false';

        const img = document.createElement('img');
        img.src = this.src;

        container.appendChild(img);
        return container;
    }

    override ignoreEvent() {
        return true;
    }
} 