// calloutWidget.ts
import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import MarkdownIt from 'markdown-it';
import ObsidianCallouts from "markdown-it-obsidian-callouts";

// Initialize markdown-it with the Obsidian callouts plugin
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
});
md.use(ObsidianCallouts);

// Regex to extract callout metadata directly from the source text
const calloutRegex = /^\s*>\s*\[!(?<type>[^\]]+)\](?<fold>[+-])?(?<title>.*)/;

export class ExpCalloutWidget extends WidgetType {
    private type: string = 'note';
    private title: string = '';
    private fold: string | null = null;
    private sourceNodeFrom: number;
    private sourceNodeTo: number;

    constructor(
        public source: string,
        sourceFrom: number,
        sourceTo: number
    ) {
        super();
        this.sourceNodeFrom = sourceFrom;
        this.sourceNodeTo = sourceTo;

        // Extract callout metadata from the source
        this.extractMetadataFromSource();
    }

    private extractMetadataFromSource(): void {
        // Split the source into lines
        const lines = this.source.split('\n');

        // Check the first line for callout metadata
        if (lines.length > 0) {
            const match = calloutRegex.exec(lines[0]);
            if (match?.groups) {
                this.type = match.groups.type.trim().toLowerCase();
                this.fold = match.groups.fold || null;
                this.title = match.groups.title.trim();
            }
        }
    }

    override eq(widget: ExpCalloutWidget): boolean {
        return widget.source === this.source &&
            widget.sourceNodeFrom === this.sourceNodeFrom &&
            widget.sourceNodeTo === this.sourceNodeTo;
    }

    toDOM(view: EditorView): HTMLElement {
        // Create container for the widget
        const container = document.createElement('div');
        container.setAttribute('contenteditable', 'false');
        container.className = `cm-callout-widget callout-${this.type}`;
        container.setAttribute('callout-type', this.getCalloutType());
        container.dataset.callout = this.type;

        // Render the content using markdown-it
        container.innerHTML = md.render(this.source)
        // Find the rendered callout within markdown-it output
        const renderedCallout = container.querySelector('.callout');

        // If markdown-it's plugin didn't create a proper callout structure,
        // we need to ensure our container has the right classes

        if (this.fold && renderedCallout) {
            container.dataset.foldState = renderedCallout.getAttribute('data-callout-fold') === '+' ? 'open' : 'closed'
        }

        if (!renderedCallout) {
            // We'll enhance the container itself
            this.enhanceCalloutContainer(container, view);
        } else {
            // Replace the markdown-it rendered callout with our enhanced container
            container.innerHTML = this.convertDetailsToDivs(renderedCallout);
            this.enhanceCalloutContainer(container, view);
        }

        return container;
    }

    /**
     * Recursively replaces <summary> and <details> tags with <div> equivalents
     * @param node The root node to start processing from
     */
    private replaceDetailsTags(node: Node) {
        // Create a list of elements to process (since we'll be modifying the DOM)
        const elementsToProcess: Element[] = [];

        // Collect all details and summary elements in depth-first order (bottom-up)
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (n: Element) =>
                    n.tagName === 'DETAILS' || n.tagName === 'SUMMARY'
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP
            }
        );

        while (walker.nextNode()) {
            elementsToProcess.push(walker.currentNode as Element);
        }

        // Process from deepest to shallowest to maintain DOM integrity
        for (const element of elementsToProcess.reverse()) {
            if (element.tagName === 'SUMMARY') {
                const div = document.createElement('div');
                // Copy all attributes
                Array.from(element.attributes).forEach(attr => {
                    div.setAttribute(attr.name, attr.value);
                });
                // Add marker class and move children
                div.classList.add('summary-converted');
                div.innerHTML = element.innerHTML;
                element.replaceWith(div);
            }
            else if (element.tagName === 'DETAILS') {
                const div = document.createElement('div');
                // Copy all attributes
                Array.from(element.attributes).forEach(attr => {
                    // Convert 'open' attribute to data-open
                    const name = attr.name === 'open' ? 'data-open' : attr.name;
                    div.setAttribute(name, attr.value);
                });
                // Add marker class and move children
                div.classList.add('details-converted');
                div.innerHTML = element.innerHTML;
                element.replaceWith(div);
            }
        }
    }

    /**
     * Converts <summary> and <details> tags to <div> elements in an HTML element's outerHTML
     * @param sourceElement The element to process
     * @returns A cleaned HTML string with <div> tags
     */
    private convertDetailsToDivs(sourceElement: Element): string {
        // Create a temporary container to manipulate the DOM
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = sourceElement.outerHTML;

        // Process all nested tags recursively
        this.replaceDetailsTags(tempContainer);

        return tempContainer.innerHTML;
    }


    private getCalloutType(): string {
        // Map callout type to a category for styling
        const type = this.type.toLowerCase();

        if (type.includes('note') || type.includes('info')) {
            return 'info';
        } else if (type.includes('warning') || type.includes('alert') || type.includes('be advised')) {
            return 'warning';
        } else if (type.includes('error')) {
            return 'error';
        } else if (type.includes('crucial') || type.includes('important')) {
            return 'highlight';
        }

        return 'default';
    }

    private enhanceCalloutContainer(container: HTMLElement, view: EditorView): void {
        const calloutDiv = container.querySelector('.callout')
        if (calloutDiv) {
            const parsedIcon = calloutDiv.querySelector('.callout-title-icon')
            if(parsedIcon)
                parsedIcon.remove()
        }

        let titleDiv = container.querySelector('.callout-title');

        // Add icon to title
        if (!titleDiv?.querySelector('.callout-icon')) {
            const iconDiv = document.createElement('div');
            iconDiv.className = 'callout-icon';
            iconDiv.innerHTML = this.getIconSvg();
            titleDiv?.prepend(iconDiv);
        }

        // Add editing utilities container
        const editingUtilsContainer = document.createElement('div');
        editingUtilsContainer.className = 'editing-utils-container';

        // Add edit button
        const editButton = document.createElement('div');
        editButton.className = 'edit-block-button';
        editButton.setAttribute('aria-label', 'Edit this block');
        editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>`;

        editButton.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        editButton.onclick = (e) => {
            e.stopPropagation();
            view.dispatch({ selection: { anchor: this.sourceNodeFrom } });
            view.focus();
        };

        editingUtilsContainer.appendChild(editButton);

        // const foldButton = container.querySelector('.callout-fold')
        // if (foldButton)
        //     foldButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"></path></svg>`

        // Manually added fold button is now unnecessary thanks to markdown-it-obsidian-callout
        if (this.fold != undefined) {
            const foldableButton = document.createElement('div');
            foldableButton.className = 'callout-fold';
            foldableButton.setAttribute('aria-label', this.fold === '+' ? 'Expand' : 'Collapse');

            foldableButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"></path></svg>`;

            foldableButton.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            foldableButton.onclick = (e) => {
                const currentFoldState = container.hasAttribute('open');

                if (currentFoldState) {
                    // toggles open to closed state
                    container.removeAttribute('open')

                    container.dataset.foldState = 'closed';
                    container.setAttribute('aria-label', 'Expand');
                } else {
                    // toggles closed to open state
                    container.setAttribute('open', '')

                    container.dataset.foldState = 'open';
                    container.setAttribute('aria-label', 'Collapse');
                }
            };

            editingUtilsContainer.appendChild(foldableButton);
        }

        // Append utilities container
        container.appendChild(editingUtilsContainer);
    }

    private getIconSvg(): string {
        const type = this.type.toLowerCase();

        if (type.includes('note') || type.includes('info')) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15V10m0-3h.01"></path></svg>`;
        } else if (type.includes('warning') || type.includes('alert') || type.includes('be advised')) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
        } else if (type.includes('error')) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>`;
        } else if (type.includes('crucial') || type.includes('important')) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flame"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15V10m0-3h.01"></path></svg>`;
    }

    override ignoreEvent(event: Event): boolean {
        if ((event.type === "click" || event.type === "mousedown")) {
            const target = event.target as Element;

            // Check if the click is on any interactive element within the widget
            if (target.closest('.edit-block-button') || target.closest('.callout-title-foldable')) {
                return true;
            }
        }
        return false;
    }
}
