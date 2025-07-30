import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';
import { CalloutWidget } from './widget/CalloutWidget';
import type { SyntaxNode } from '@lezer/common';

function isNodeRangeActive(state: EditorState, nodeFrom: number, nodeTo: number): boolean {
  const cursor = state.selection.main;
  return Math.max(nodeFrom, cursor.from) <= Math.min(nodeTo, cursor.to);
}

function getCalloutNode(blockquoteNode: SyntaxNode): SyntaxNode | null {
    let calloutNode: SyntaxNode | null = null;
    let paragraphNode: SyntaxNode | null = null;

    // Find the first paragraph within the blockquote
    blockquoteNode.cursor().iterate(node => {
        if (node.name === 'Paragraph') {
            paragraphNode = node.node;
            return false; // Stop after finding the first paragraph
        }
    });

    if (!paragraphNode) return null;
    
    // Check for a Callout node within that paragraph
    paragraphNode.cursor().iterate(node => {
        if (node.name === 'Callout') {
            calloutNode = node.node;
            return false; // Stop after finding the callout
        }
    });

    return calloutNode;
}


function buildCalloutWidgetDecorations(state: EditorState): EditorRange<Decoration>[] {
  const decorations: EditorRange<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === 'Blockquote') {
        const calloutNode = getCalloutNode(node.node);
        
        if (calloutNode) {
          const isActive = isNodeRangeActive(state, node.from, node.to);

          if (!isActive) {
            decorations.push(Decoration.replace({
              widget: new CalloutWidget(calloutNode.from, calloutNode.to),
              block: true,
            }).range(node.from, node.to));
          }
          // This is a callout block, so don't process its children for more blockquotes.
          // This prevents nested callouts from creating overlapping decorations.
          return false;
        }
      }
    }
  });
  return decorations;
}

export const proseCalloutPlugin = StateField.define<DecorationSet>({
  create(state) {
    return RangeSet.of(buildCalloutWidgetDecorations(state), true);
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return RangeSet.of(buildCalloutWidgetDecorations(tr.state), true);
    }
    return value.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f)
});
