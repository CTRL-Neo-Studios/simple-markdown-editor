import { type MarkdownConfig } from '@lezer/markdown';
import { Tag } from "@lezer/highlight";

export const callout = Tag.define();
export const calloutMark = Tag.define(callout);
export const calloutType = Tag.define(callout);
export const calloutFold = Tag.define(callout);
export const calloutTitle = Tag.define(callout);

const CalloutNode = { name: "Callout", style: callout };
const CalloutMarkNode = { name: "CalloutMark", style: calloutMark };
const CalloutTypeNode = { name: "CalloutType", style: calloutType };
const CalloutFoldNode = { name: "CalloutFoldMark", style: calloutFold };
const CalloutTitleNode = { name: "CalloutTitle", style: calloutTitle };

const calloutRegex = /^\[!(?<type>[^\]]+)\](?<fold>[+-])?(?<title>.*)/;

export const calloutParser: MarkdownConfig = {
  defineNodes: [
    CalloutNode,
    CalloutMarkNode,
    CalloutTypeNode,
    CalloutFoldNode,
    CalloutTitleNode,
  ],
  parseInline: [{
    name: "Callout",
    parse(cx, next, pos) {
      const text = cx.slice(pos, cx.end);
      const match = calloutRegex.exec(text);

      if (!match || !match.groups) {
        return -1;
      }
      
      const { type, fold, title } = match.groups;
      if (!type) {
        return -1;
      }

      const fullMatchLength = match[0].length;
      const children = [];
      let currentPosInMatch = 0;

      // Mark for "[!"
      children.push(cx.elt("CalloutMark", pos + currentPosInMatch, pos + currentPosInMatch + 2));
      currentPosInMatch += 2;

      // Type
      children.push(cx.elt("CalloutType", pos + currentPosInMatch, pos + currentPosInMatch + type.length));
      currentPosInMatch += type.length;
      
      // Mark for "]"
      children.push(cx.elt("CalloutMark", pos + currentPosInMatch, pos + currentPosInMatch + 1));
      currentPosInMatch += 1;
      
      // Fold
      if (fold) {
        children.push(cx.elt("CalloutFoldMark", pos + currentPosInMatch, pos + currentPosInMatch + 1));
        currentPosInMatch += 1;
      }
      
      // Title
      if (title) {
        const trimmedTitle = title.trim();
        if (trimmedTitle.length > 0) {
            const titleStartOffset = title.indexOf(trimmedTitle);
            const titleStart = pos + currentPosInMatch + titleStartOffset;
            children.push(cx.elt("CalloutTitle", titleStart, titleStart + trimmedTitle.length));
        }
      }

      return cx.addElement(cx.elt("Callout", pos, pos + fullMatchLength, children));
    },
    before: "Link"
  }]
};
