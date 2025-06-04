import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange, Line as EditorLine } from '@codemirror/state'; // Keep EditorRange
import type { SyntaxNode } from '@lezer/common';

function isNodeRangeActive(state: EditorState, nodeFrom: number, nodeTo: number): boolean {
    const cursor = state.selection.main;
    if (cursor.empty) {
        return cursor.from >= nodeFrom && cursor.from <= nodeTo;
    } else {
        // Check for any overlap: selection start is before node end, AND selection end is after node start
        return Math.max(nodeFrom, cursor.from) < Math.min(nodeTo, cursor.to);
    }
}

// (getBlockquoteLevel and settings remain the same)
function getBlockquoteLevel(node: SyntaxNode | null): number {
    let level = 0;
    let current = node;
    while (current) {
        if (current.name === 'Blockquote' || current.name === 'Callout') {
            level++;
        }
        current = current.parent;
    }
    return level;
}

const settings = {
    baseMarkerAreaWidthPx: 29,
    perLevelIndentPxWidth: 36,
};


function buildBlockquoteDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];
    const cursor = state.selection.main;

    syntaxTree(state).iterate({
        filter: (nodeRef) => nodeRef.name === 'Blockquote' || nodeRef.name === 'Callout',
        enter: (blockquoteNodeRef) => {
            const blockquoteNode = blockquoteNodeRef.node;

            // If this is a Callout node, check if it's inactive.
            // If inactive, CalloutWidget will render it, so proseBlockquotePlugin should skip it.
            if (blockquoteNode.name === 'Callout') {
                const isActive = isNodeRangeActive(state, blockquoteNode.from, blockquoteNode.to);
                if (!isActive) {
                    return; // Skip adding line/mark decorations for this inactive Callout
                }
            }

            const level = getBlockquoteLevel(blockquoteNode);

            // === Add Line Decorations ===
            for (let lPos = blockquoteNode.from; lPos < blockquoteNode.to;) {
                const line = state.doc.lineAt(lPos);
                if (line.from >= blockquoteNode.from && line.from < blockquoteNode.to) {
                    const totalPaddingPx = settings.baseMarkerAreaWidthPx + ((level -1) * settings.perLevelIndentPxWidth);
                    let lineClasses = ['HyperMD-quote', `HyperMD-quote-${level}`];
                    // Check if this line is the first line of a Callout (not a generic Blockquote)
                    // Ensure blockquoteNode is indeed a Callout for this specific styling.
                    if (blockquoteNode.name === 'Callout' && line.from === blockquoteNode.from) {
                        // This additional check ensures we only add 'HyperMD-callout' if it's truly a Callout node.
                        // The previous `isNodeRangeActive` check for Callouts ensures we only style *active* Callouts here.
                        lineClasses.push('HyperMD-callout');
                    }
                    decorations.push(Decoration.line({
                        attributes: {
                            class: lineClasses.join(' '),
                            style: `text-indent: -${totalPaddingPx}px; padding-inline-start: ${totalPaddingPx}px;`
                        }
                    }).range(line.from));
                }
                if (line.to >= blockquoteNode.to) { // Check if current line extends to or past blockquoteNode.to
                    break;
                }
                lPos = line.to + 1;
                if (lPos <= line.from) break;
            }

            // === Add QuoteMark Hiding Decorations ===
            syntaxTree(state).iterate({
                from: blockquoteNode.from,
                to: blockquoteNode.to,
                filter: (childNodeRef) => childNodeRef.name === 'QuoteMark',
                enter: (quoteMarkNodeRef) => {
                    const lineOfMark = state.doc.lineAt(quoteMarkNodeRef.from);
                    const cursorOnMarkLine = cursor.head >= lineOfMark.from && cursor.head <= lineOfMark.to &&
                        cursor.anchor >= lineOfMark.from && cursor.anchor <= lineOfMark.to;

                    if (!cursorOnMarkLine) {
                        if (quoteMarkNodeRef.from < quoteMarkNodeRef.to) {
                            decorations.push(Decoration.replace({})
                                .range(quoteMarkNodeRef.from, quoteMarkNodeRef.to));
                        } else {
                            console.warn("Invalid QuoteMark node range:", quoteMarkNodeRef.from, quoteMarkNodeRef.to);
                        }
                    }
                }
            });
        }
    });

    // CRITICAL: Sort decorations more robustly
    return decorations.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        // Decoration instances have `startSide` and `endSide` getters.
        // These typically resolve to large negative/positive numbers for default point/mark behavior.
        // RangeSet's internal comparison uses startSide as a primary tie-breaker after 'from'.
        if (a.startSide !== b.startSide) return a.startSide - b.startSide;
        if (a.to !== b.to) return a.to - b.to;
        if (a.endSide !== b.endSide) return a.endSide - b.endSide;
        return 0;
    });
}

export const proseBlockquotePlugin = StateField.define<DecorationSet>({
    create(state) {
        // Ensure buildBlockquoteDecorations is robust enough not to throw during initial creation
        try {
            return RangeSet.of(buildBlockquoteDecorations(state), true);
        } catch (e) {
            console.error("Error creating RangeSet in proseBlockquotePlugin create:", e);
            return RangeSet.empty;
        }
    },
    update(value, tr) {
        if (tr.docChanged || tr.selection) {
            try {
                return RangeSet.of(buildBlockquoteDecorations(tr.state), true);
            } catch (e) {
                console.error("Error creating RangeSet in proseBlockquotePlugin update:", e, tr.state.doc.toString());
                return value.map(tr.changes); // Fallback to mapping old decos to avoid editor crash
            }
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});

