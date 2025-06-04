// ~/utils/codemirror-rich-markdoc/parsers/calloutParser.ts
import { BlockContext, Line, type MarkdownConfig, Element } from '@lezer/markdown';
import {Tag} from "@lezer/highlight";

// Regex to capture:
// 1. type: The string inside [! and ] (e.g., "note with spaces")
// 2. fold: Optional "+" or "-" character immediately after "]"
// 3. title: Optional explicit title text after the fold character or "]"
const calloutDefinitionRegex = /^\s*>\s*\[!(?<type>[^\]]+)\](?<fold>[+-])?(?<title>.*)/;


export const callout = Tag.define()
export const calloutMark = Tag.define(callout)
export const calloutTypeString = Tag.define(callout)
export const calloutFoldIndicator = Tag.define(callout)
export const calloutTitleString = Tag.define(callout)

export const calloutParser: MarkdownConfig = {
    defineNodes: [
        { name: "Callout", block: true, style: callout },
        { name: "CalloutMark", style: calloutMark },
        { name: "CalloutTypeString", style: calloutTypeString },
        { name: "CalloutFoldIndicator", style: calloutFoldIndicator},
        { name: "CalloutTitleString", style: calloutTitleString },
        // Standard GFM QuoteMark for content lines' ">"
        { name: "QuoteMark" } // Ensure QuoteMark is defined if not already by blockquoteParser
    ],
    parseBlock: [{
        name: "Callout",
        parse(cx: BlockContext, line: Line): boolean {
            let match = calloutDefinitionRegex.exec(line.text);
            if (!match || !match.groups) return false;

            const { type: rawType, fold: foldIndicator, title: rawTitle } = match.groups;
            // Trim type and title text extracted from regex groups
            const calloutTypeStr = rawType.trim();
            const explicitTitleStr = rawTitle.trim();

            const firstLineStartGlobal = cx.lineStart; // Global start of the first "> [!type]..." line
            const elements: Element[] = [];
            const defLineEndGlobal = cx.lineStart + line.text.length;

            // --- Parse the first line (callout definition) ---

            // ">" mark
            const quoteMarkPosInLine = line.text.indexOf(">");
            if (quoteMarkPosInLine === -1) return false; // Should not happen if regex matched
            elements.push(cx.elt("QuoteMark", cx.lineStart + quoteMarkPosInLine, cx.lineStart + quoteMarkPosInLine + 1));

            // "[!" mark
            const openBracketPosInLine = line.text.indexOf("[!", quoteMarkPosInLine);
            if (openBracketPosInLine === -1) return false;
            elements.push(cx.elt("CalloutMark", cx.lineStart + openBracketPosInLine, cx.lineStart + openBracketPosInLine + 2));

            // CalloutTypeString: content between "[!" and "]"
            const closeBracketPosInLine = line.text.indexOf("]", openBracketPosInLine + 2);
            if (closeBracketPosInLine === -1) return false; // Malformed if no closing bracket for type
            elements.push(cx.elt("CalloutTypeString",
                cx.lineStart + openBracketPosInLine + 2, // After "[!"
                cx.lineStart + closeBracketPosInLine    // Before "]"
            ));

            // "]" mark
            elements.push(cx.elt("CalloutMark", cx.lineStart + closeBracketPosInLine, cx.lineStart + closeBracketPosInLine + 1));

            // Position for searching for title, starts after "]"
            let searchPosForTitleInLine = closeBracketPosInLine + 1;

            // CalloutFoldIndicator (if present)
            if (foldIndicator) {
                const foldIndicatorPosInLine = line.text.indexOf(foldIndicator, closeBracketPosInLine + 1);
                if (foldIndicatorPosInLine !== -1) {
                    elements.push(cx.elt("CalloutFoldIndicator",
                        cx.lineStart + foldIndicatorPosInLine,
                        cx.lineStart + foldIndicatorPosInLine + 1
                    ));
                    searchPosForTitleInLine = foldIndicatorPosInLine + 1; // Title search starts after fold indicator
                }
            }

            // CalloutTitleString (if explicit title is present)
            if (explicitTitleStr.length > 0) {
                // Find the start of the trimmed title text
                const titleActualStartInLine = line.text.indexOf(explicitTitleStr, searchPosForTitleInLine);
                if (titleActualStartInLine !== -1) {
                    elements.push(cx.elt("CalloutTitleString",
                        cx.lineStart + titleActualStartInLine,
                        cx.lineStart + titleActualStartInLine + explicitTitleStr.length
                    ));
                }
            }

            // --- Consume content lines ---
            let calloutBlockEndGlobal = defLineEndGlobal;

            while (cx.nextLine()) {
                if (line.isBlank) {
                    let nextLookAhead = cx.input.chunk(cx.lineStart + line.text.length + 1);
                    if (!/^\s*>/.test(nextLookAhead)) { // Check if line after blank isn't part of callout continuation
                        break;
                    }
                }

                if (!/^\s*>/.test(line.text.slice(line.pos))) { // Actual line content (after indent) must start with ">"
                    break;
                }

                const contentLineQuoteMarkPos = line.text.indexOf(">");
                if (contentLineQuoteMarkPos !== -1) {
                    elements.push(cx.elt("QuoteMark", cx.lineStart + contentLineQuoteMarkPos, cx.lineStart + contentLineQuoteMarkPos + 1));
                }
                // The actual content of these lines will be parsed by subsequent block/inline parsers
                // as children of the "Callout" node. This parser primarily defines the Callout block boundary
                // and its special first-line markers.

                calloutBlockEndGlobal = cx.lineStart + line.text.length;
            }

            cx.addElement(cx.elt("Callout", firstLineStartGlobal, calloutBlockEndGlobal, elements));
            return true;
        },
        before: "Blockquote", // Run before GFM's Blockquote
    }]
};
