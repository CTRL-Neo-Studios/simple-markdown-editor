import { Decoration, type PluginValue } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import type { Range } from '@codemirror/state';

const tokenElement = [
    'InlineCode',
    'Emphasis',
    'StrongEmphasis',
    'FencedCode',
    'Link',
    'Strikethrough',
    'Task',
    // 'Blockquote',
];

const tokenHidden = [
    'HardBreak',
    'LinkMark',
    'EmphasisMark',
    'CodeMark',
    'CodeInfo',
    'URL',
    'StrikethroughMark',
    'TaskMarker',
];

const decorationHidden = Decoration.mark({ class: 'cm-markdoc-hidden' });
const decorationBullet = Decoration.mark({ class: 'cm-markdoc-bullet' });
const decorationCode = Decoration.mark({ class: 'cm-markdoc-code' });
const decorationTag = Decoration.mark({ class: 'cm-markdoc-tag' });

export default class RichEditPlugin implements PluginValue {
    public decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.process(view);
    }

    update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet)
            this.decorations = this.process(update.view);
    }

    process(view: EditorView): DecorationSet {
        let widgets: Range<Decoration>[] = [];
        let [cursor] = view.state.selection.ranges;

        for (let { from, to } of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from, to,
                enter(node) {
                    const cursorFrom = cursor?.from || 0
                    const cursorTo = cursor?.to || 0
                    const nodeFrom = node.from
                    const nodeTo = node.to
                    const nodeName = node.name
                    const cursorLineNum = view.state.doc.lineAt(cursorFrom).number;
                    const nodeLineNum = view.state.doc.lineAt(nodeFrom).number;

                    if (nodeName === 'QuoteMark') { // 'QuoteMark' is the typical Lezer name for '>'
                        if (nodeLineNum !== cursorLineNum) {
                            // Cursor is not on the same line as the QuoteMark.
                            // Hide '>' and the following space.
                            // QuoteMark is just '>', so we extend to `nodeTo + 1` to include the space.
                            widgets.push(decorationHidden.range(nodeFrom, nodeTo + 1));
                        }
                        // If cursor IS on the same line, no decoration is added here, so '>' remains visible.
                        // It's good practice to stop further processing for this node if handled.
                        return; // Or `continue;` depending on Lezer's iterate API version details
                    }

                    if ((nodeName.startsWith('ATXHeading') || tokenElement.includes(nodeName)) &&
                        (cursorFrom >= nodeFrom && cursorTo <= nodeTo))
                        return false;

                    if (nodeName === 'MarkdocTag')
                        widgets.push(decorationTag.range(nodeFrom, nodeTo));

                    if (nodeName === 'FencedCode')
                        widgets.push(decorationCode.range(nodeFrom, nodeTo));

                    if (nodeName === 'ListMark' && node.matchContext(['BulletList', 'ListItem']) && cursorFrom != nodeFrom && cursorFrom != nodeFrom + 1)
                        widgets.push(decorationBullet.range(nodeFrom, nodeTo));

                    if (nodeName === 'HeaderMark')
                        widgets.push(decorationHidden.range(nodeFrom, nodeTo + 1));

                    if (tokenHidden.includes(nodeName))
                        widgets.push(decorationHidden.range(nodeFrom, nodeTo));

                }
            });
        }

        return Decoration.set(widgets, true);
    }
}
