import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type {SyntaxNode} from "@lezer/common";

export class CalloutWidget extends WidgetType {
    private type: string = 'note';
    private title: string = '';
    private fold: string | null = null;
    private contentText: string = '';

    constructor(private sourceNodeFrom: number, private sourceNodeTo: number) {
        super();
    }

    private extractDetails(view: EditorView): void {
        const state = view.state;
        let calloutNode: SyntaxNode | undefined;
        syntaxTree(state).iterate({
            from: this.sourceNodeFrom,
            to: this.sourceNodeTo,
            enter: (nodeRef) => {
                if (nodeRef.name === 'Callout' && nodeRef.from === this.sourceNodeFrom) {
                    calloutNode = nodeRef.node;
                    return false;
                }
            }
        });

        if (calloutNode) { // No need to check calloutNode.name again if the iterator found 'Callout'
            const typeNode = calloutNode.getChild('CalloutTypeString');
            if (typeNode) {
                this.type = state.doc.sliceString(typeNode.from, typeNode.to);
            }
            const titleNode = calloutNode.getChild('CalloutTitleString');
            if (titleNode) {
                this.title = state.doc.sliceString(titleNode.from, titleNode.to);
            }
            const foldNode = calloutNode.getChild('CalloutFoldIndicator');
            if (foldNode) {
                this.fold = state.doc.sliceString(foldNode.from, foldNode.to);
            }

            let contentLines: string[] = [];
            let firstLineProcessed = false;
            let currentPos = calloutNode.from;

            while(currentPos < calloutNode.to && currentPos < state.doc.length) {
                const line = state.doc.lineAt(currentPos);

                if (!firstLineProcessed) {
                    firstLineProcessed = true;
                    currentPos = line.to + 1;
                    if (currentPos <= line.from) {
                        console.warn("CalloutWidget: Stalled in content extraction (first line).");
                        break;
                    }
                    continue;
                }

                let lineText = state.doc.sliceString(line.from, line.to);
                if (lineText.match(/^\s*>\s/)) {
                    contentLines.push(lineText.replace(/^\s*>\s/, ''));
                } else if (lineText.match(/^\s*>/)) {
                    contentLines.push(lineText.replace(/^\s*>/, ''));
                }
                // If a line inside calloutNode.to doesn't start with '>', it might be an issue
                // with the parser including too much, or this logic should handle it.
                // For now, this only adds lines starting with '>'.

                currentPos = line.to + 1;
                if (currentPos <= line.from) {
                    console.warn("CalloutWidget: Stalled in content extraction (content line).");
                    break;
                }
            }
            this.contentText = contentLines.join('\n').trim();
        } else {
            console.warn("CalloutWidget: Could not find Callout node at", this.sourceNodeFrom);
            this.type = 'note'; // Reset to default
            this.title = '';
            this.fold = null;
            this.contentText = "";
        }
    }


    toDOM(view: EditorView): HTMLElement {
        this.extractDetails(view);

        const widgetRoot = document.createElement('div');
        widgetRoot.className = `cm-callout-widget callout callout-${this.type.toLowerCase()}`;
        widgetRoot.setAttribute('contenteditable', 'false');
        widgetRoot.setAttribute('callout-type', 'default');
        widgetRoot.dataset.callout = this.type.toLowerCase();
        if (this.fold) {
            // Set initial fold state based on '+' (closed by default in reading view, but widget can interpret differently)
            // Obsidian: '+' means initially folded (closed), '-' means initially expanded (open).
            // Your `dataset.calloutFold` logic might need to align with this if you want parity.
            // Current: '+' -> 'closed', '-' -> 'open'. This seems fine.
            widgetRoot.dataset.calloutFold = this.fold === '+' ? 'open' : 'closed';
        }

        const titleDiv = document.createElement('div');
        titleDiv.className = 'callout-title';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'callout-icon';
        let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15V10m0-3h.01"></path></svg>`;
        if (this.type.toLowerCase().includes('note') || this.type.toLowerCase().includes('info')) {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15V10m0-3h.01"></path></svg>`;
            widgetRoot.setAttribute('callout-type', 'info');
        } else if (this.type.toLowerCase().includes('warning') || this.type.toLowerCase().includes('alert') || this.type.toLowerCase().includes('be advised')) {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`
            widgetRoot.setAttribute('callout-type', 'warning');
        } else if (this.type.toLowerCase().includes('error')) {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>`
            widgetRoot.setAttribute('callout-type', 'error');
        } else if (this.type.toLowerCase().includes('crucial') || this.type.toLowerCase().includes('important')) {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flame"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`
            widgetRoot.setAttribute('callout-type', 'highlight');
        }
        iconDiv.innerHTML = iconSvg;

        const titleInnerDiv = document.createElement('div');
        titleInnerDiv.className = 'callout-title-inner';
        titleInnerDiv.textContent = this.title || this.type.charAt(0).toUpperCase() + this.type.slice(1);

        titleDiv.appendChild(iconDiv);
        titleDiv.appendChild(titleInnerDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'callout-content'; // Removed 'cm-line' for safety
        const p = document.createElement('p');
        // Ensure contentText is properly HTML-escaped if it can contain characters like <, > ,&
        // For simple text to <br>, this is okay. For arbitrary Markdown, you'd need a renderer.
        p.innerHTML = this.contentText.replace(/\n/g, '<br>');
        contentDiv.appendChild(p);

        const editingUtilsContainer = document.createElement('div');
        editingUtilsContainer.className = 'editing-utils-container'; // A container for buttons

        const editButton = document.createElement('div');
        editButton.className = 'edit-block-button';
        editButton.setAttribute('aria-label', 'Edit this block');
        editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>`;
        editButton.onmousedown = (e) => {
            e.preventDefault()
            e.stopPropagation();
        };
        editButton.onclick = (e) => {
            e.stopPropagation();
            view.dispatch({ selection: { anchor: this.sourceNodeFrom } });
            view.focus();
        };
        editingUtilsContainer.appendChild(editButton);

        if (this.fold) {
            const foldableButton = document.createElement('div');
            foldableButton.classList.add('callout-title-foldable'); // For styling and event handling
            foldableButton.setAttribute('aria-label', this.fold === '+' ? 'Expand' : 'Collapse'); // Accessibility

            foldableButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"></path></svg>`;

            foldableButton.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
            }
            foldableButton.onclick = (e) => {
                const currentFoldState = widgetRoot.dataset.calloutFold;
                if (currentFoldState === 'open') {
                    widgetRoot.dataset.calloutFold = 'closed';
                    foldableButton.setAttribute('aria-label', 'Expand');
                } else {
                    widgetRoot.dataset.calloutFold = 'open';
                    foldableButton.setAttribute('aria-label', 'Collapse');
                }
            };
            editingUtilsContainer.appendChild(foldableButton);
        }

        widgetRoot.appendChild(titleDiv);
        widgetRoot.appendChild(contentDiv);
        widgetRoot.appendChild(editingUtilsContainer); // Append the container with all buttons

        return widgetRoot;
    }

    override eq(other: CalloutWidget): boolean {
        return other.sourceNodeFrom === this.sourceNodeFrom &&
            other.sourceNodeTo === this.sourceNodeTo &&
            other.type === this.type &&
            other.title === this.title &&
            other.fold === this.fold &&
            other.contentText === this.contentText;
    }

    override ignoreEvent(event: Event): boolean {
        // console.log(`CalloutWidget ignoreEvent: type=${event.type}, target=`, event.target); // DEBUG
        if ((event.type === "click" || event.type === "mousedown")) {
            const target = event.target as Element; // Use Element for robustness with SVG

            // Check if the click is on any interactive element within the widget
            if (target.closest('.edit-block-button') || target.closest('.callout-title-foldable')) {
                // console.log("  CalloutWidget: IGNORING event (button click)"); // DEBUG
                return true;
            }
            // If the click is on the known utility container but not on a specific button,
            // and you want to prevent prose reveal, you could also return true here.
            // However, usually clicks on non-interactive parts of the widget should reveal prose.
            // if (target.closest('.editing-utils-container')) {
            //    return true; // This would make the padding around buttons also not reveal prose.
            // }
        }
        // console.log("  CalloutWidget: NOT ignoring event (returning false)"); // DEBUG
        return false; // Let CodeMirror handle other clicks (e.g., on text content to edit)
    }
}
