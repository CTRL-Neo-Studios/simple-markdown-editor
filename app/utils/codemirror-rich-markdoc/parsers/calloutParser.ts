import { BlockContext, Line, type MarkdownConfig, Element } from '@lezer/markdown';
import { Tag } from "@lezer/highlight";

// Regex to match callout definition lines, with nested blockquote support
// Captures:
// - indentation: leading whitespace
// - quotePrefixes: one or more '>' with spaces (for nesting)
// - type: the callout type inside [! and ]
// - fold: optional fold indicator (+ or -)
// - title: optional title after the callout marker
const calloutRegex = /^(\s*)((?:>\s*)+)\[!(?<type>[^\]]+)\](?<fold>[+-])?(?<title>.*)/;

// Tags for syntax highlighting
export const callout = Tag.define();
export const calloutMark = Tag.define(callout);
export const calloutTypeString = Tag.define(callout);
export const calloutFoldIndicator = Tag.define(callout);
export const calloutTitleString = Tag.define(callout);

export const calloutParser: MarkdownConfig = {
    defineNodes: [
        { name: "Callout", block: true, style: callout },
        { name: "CalloutMark", style: calloutMark },
        { name: "CalloutTypeString", style: calloutTypeString },
        { name: "CalloutFoldIndicator", style: calloutFoldIndicator },
        { name: "CalloutTitleString", style: calloutTitleString },
    ],
    parseBlock: [{
        name: "Callout",
        parse(cx: BlockContext, line: Line): boolean {
            const match = calloutRegex.exec(line.text);
            if (!match || !match.groups) return false;

            const { type: rawType, fold: foldIndicator, title: rawTitle } = match.groups;
            const indentation = match[1];
            const quotePrefixes = match[2];

            // Determine nesting level by counting '>' characters
            const nestingLevel = (quotePrefixes.match(/>/g) || []).length;

            // Trim type and title
            const calloutTypeStr = rawType.trim();
            const explicitTitleStr = rawTitle.trim();

            // Calculate positions
            const firstLineStartGlobal = cx.lineStart;
            const elements: Element[] = [];

            // Parse the first line (callout definition)
            const prefixEndPos = indentation.length + quotePrefixes.length;
            const openBracketPos = prefixEndPos;
            const typeStartPos = openBracketPos + 2; // After "[!"
            const typeBracketEndPos = typeStartPos + calloutTypeStr.length;
            const closeBracketPos = typeBracketEndPos;

            // Add callout mark for "[!"
            elements.push(cx.elt("CalloutMark",
                firstLineStartGlobal + openBracketPos,
                firstLineStartGlobal + typeStartPos
            ));

            // Add callout type
            elements.push(cx.elt("CalloutTypeString",
                firstLineStartGlobal + typeStartPos,
                firstLineStartGlobal + typeBracketEndPos
            ));

            // Add closing bracket mark for "]"
            elements.push(cx.elt("CalloutMark",
                firstLineStartGlobal + closeBracketPos,
                firstLineStartGlobal + closeBracketPos + 1
            ));

            // Position for searching for title/fold indicator
            let currentPos = closeBracketPos + 1;

            // Add fold indicator if present
            if (foldIndicator) {
                const foldPos = line.text.indexOf(foldIndicator, closeBracketPos + 1);
                if (foldPos !== -1) {
                    elements.push(cx.elt("CalloutFoldIndicator",
                        firstLineStartGlobal + foldPos,
                        firstLineStartGlobal + foldPos + 1
                    ));
                    currentPos = foldPos + 1;
                }
            }

            // Add title if present
            if (explicitTitleStr.length > 0) {
                const titlePos = line.text.indexOf(explicitTitleStr, currentPos);
                if (titlePos !== -1) {
                    elements.push(cx.elt("CalloutTitleString",
                        firstLineStartGlobal + titlePos,
                        firstLineStartGlobal + titlePos + explicitTitleStr.length
                    ));
                }
            }

            // Track the callout's content boundaries
            let calloutEndPos = firstLineStartGlobal + line.text.length;
            let prevLineIndentLevel = nestingLevel;

            // Process subsequent content lines
            while (cx.nextLine()) {
                // Check if we've reached the end of the callout
                if (line.isBlank) {
                    // Check if next line continues the callout
                    const nextLine = cx.lineStart + line.text.length;
                    const peek = cx.input.chunk(nextLine);

                    // If next line doesn't have enough '>' markers, we're done with this callout
                    const nextLineQuoteCount = (peek.match(/^\s*>/g) || []).length;
                    if (nextLineQuoteCount < nestingLevel) {
                        break;
                    }
                }

                // Check if this line has the required nesting level of '>' markers
                const lineQuotes = line.text.match(/^\s*(?:>\s*)+/);
                if (!lineQuotes) break;

                const lineQuoteCount = (lineQuotes[0].match(/>/g) || []).length;

                // If this line has fewer '>' than our callout's level, we're done
                if (lineQuoteCount < nestingLevel) {
                    break;
                }

                // If this is the start of a nested callout with higher nesting level, continue
                // (the nested callout will be parsed by another call to this parser)
                const isNestedCallout = calloutRegex.test(line.text) && lineQuoteCount > prevLineIndentLevel;
                if (!isNestedCallout) {
                    // Update the callout's end position
                    calloutEndPos = cx.lineStart + line.text.length;
                }

                prevLineIndentLevel = lineQuoteCount;
            }

            // Add the complete callout element
            cx.addElement(cx.elt("Callout", firstLineStartGlobal, calloutEndPos, elements));

            // Rewind to ensure nested content is properly parsed
            if (cx.lineStart + line.text.length >= calloutEndPos) {
                cx.nextLine();
            }

            return true;
        },
        before: "Blockquote" // Run before blockquote parser
    }]
};
