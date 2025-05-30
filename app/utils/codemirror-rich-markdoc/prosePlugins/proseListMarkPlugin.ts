// ~/utils/codemirror-rich-markdoc/prosePlugins/listMarkPlugin.ts
import {Decoration, type DecorationSet, EditorView} from '@codemirror/view';
import { StateField, RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range as EditorRange } from '@codemirror/state';
import { TaskCheckboxWidget } from './widget/TaskCheckboxWidget';

function buildDecorations(state: EditorState): EditorRange<Decoration>[] {
    const decorations: EditorRange<Decoration>[] = [];
    const processedLines = new Set<number>();
    const cursor = state.selection.main;

    syntaxTree(state).iterate({
        enter(node) {
            if (node.name === 'ListItem') {
                const line = state.doc.lineAt(node.from);

                // Skip if we've already processed this line
                if (processedLines.has(line.number)) {
                    return;
                }
                processedLines.add(line.number);

                // Check if cursor is on this line
                const cursorOnThisLine = cursor.from >= line.from && cursor.from <= line.to;

                // Check if this is a task list item
                let taskMarkerNode: any = null;
                let listMarkNode: any = null;
                let isTaskList = false;
                let isChecked = false;

                // Look for ListMark and TaskMarker within this ListItem
                node.node.cursor().iterate(child => {
                    if (child.name === 'ListMark') {
                        listMarkNode = child;
                    } else if (child.name === 'TaskMarker') {
                        taskMarkerNode = child;
                        isTaskList = true;
                        const markerText = state.doc.sliceString(child.from, child.to);
                        isChecked = markerText.includes('X') || markerText.includes('x');
                    }
                });

                // Find the parent list type
                let listType: 'ordered' | 'unordered' | null = null;
                let listLevel = 1;
                let parent = node.node.parent;

                while (parent) {
                    if (parent.name === 'BulletList') {
                        listType = 'unordered';
                        break;
                    } else if (parent.name === 'OrderedList') {
                        listType = 'ordered';
                        break;
                    }
                    parent = parent.parent;
                }

                if (!listType) return;

                // Apply line-level decoration for the list line
                const lineClasses = [
                    'prose-cm-list-line',
                    `prose-cm-list-line-${listLevel}`,
                    `prose-cm-list-${listType}`
                ];

                if (isTaskList) {
                    lineClasses.push('prose-cm-task-line');
                }

                const lineAttrs: any = {
                    class: lineClasses.join(' '),
                    style: `text-indent: -${isTaskList ? '30' : (listType === 'ordered' ? '29' : '22')}px; padding-inline-start: ${isTaskList ? '30' : (listType === 'ordered' ? '29' : '22')}px;`
                };

                if (isTaskList) {
                    lineAttrs['data-task'] = isChecked ? 'X' : ' ';
                }

                decorations.push(
                    Decoration.line({
                        attributes: lineAttrs
                    }).range(line.from)
                );

                // Handle task lists
                if (isTaskList && taskMarkerNode) {
                    // Parse the task marker to find the actual checkbox part
                    const fullText = state.doc.sliceString(taskMarkerNode.from, taskMarkerNode.to);
                    const match = fullText.match(/^(\s*[-*+]\s+)(\[[xX ]\])(.*)$/);

                    if (match) {
                        const [, listMarkerPart, checkboxPart, contentPart] = match;
                        const listMarkerEnd = taskMarkerNode.from + listMarkerPart.length;
                        const checkboxStart = listMarkerEnd;
                        const checkboxEnd = checkboxStart + checkboxPart.length;
                        const contentStart = checkboxEnd;

                        if (!cursorOnThisLine) {
                            // When unfocused: hide the list marker, replace checkbox with widget
                            // Hide "- " part
                            decorations.push(
                                Decoration.replace({}).range(taskMarkerNode.from, listMarkerEnd)
                            );

                            // Replace checkbox with widget
                            decorations.push(
                                Decoration.replace({
                                    widget: new TaskCheckboxWidget(isChecked)
                                }).range(checkboxStart, checkboxEnd)
                            );

                            // Apply decoration to the content AFTER the checkbox
                            if (contentStart < taskMarkerNode.to) {
                                decorations.push(
                                    Decoration.mark({
                                        class: `cm-list-${listLevel}`,
                                        tagName: 'span'
                                    }).range(contentStart, taskMarkerNode.to)
                                );
                            }
                        } else {
                            // When focused: show everything with proper styling
                            const markerClasses = [
                                'cm-formatting',
                                'cm-formatting-list',
                                'cm-formatting-list-ul',
                                `cm-list-${listLevel}`
                            ];

                            // Style the list marker part
                            decorations.push(
                                Decoration.mark({
                                    class: markerClasses.join(' '),
                                    tagName: 'span'
                                }).range(taskMarkerNode.from, listMarkerEnd)
                            );

                            decorations.push(
                                Decoration.mark({
                                    class: 'list-bullet',
                                    tagName: 'span'
                                }).range(taskMarkerNode.from, taskMarkerNode.from + listMarkerPart.replace(/\s+$/, '').length)
                            );

                            // Apply decoration to the entire task item content
                            decorations.push(
                                Decoration.mark({
                                    class: `cm-list-${listLevel}`,
                                    tagName: 'span'
                                }).range(taskMarkerNode.from, taskMarkerNode.to)
                            );
                        }
                    }
                } else if (!isTaskList && listMarkNode) {
                    // Handle regular (non-task) lists
                    let markerEnd = listMarkNode.to;
                    if (state.doc.sliceString(listMarkNode.to, listMarkNode.to + 1) === ' ') {
                        markerEnd = listMarkNode.to + 1;
                    }

                    const markerClasses = [
                        'cm-formatting',
                        'cm-formatting-list',
                        `cm-formatting-list-${listType === 'ordered' ? 'ol' : 'ul'}`,
                        `cm-list-${listLevel}`
                    ];

                    decorations.push(
                        Decoration.mark({
                            class: markerClasses.join(' '),
                            tagName: 'span'
                        }).range(listMarkNode.from, markerEnd)
                    );

                    decorations.push(
                        Decoration.mark({
                            class: listType === 'ordered' ? 'list-number' : 'list-bullet',
                            tagName: 'span'
                        }).range(listMarkNode.from, listMarkNode.to)
                    );

                    // Apply decoration to list content
                    const contentStart = markerEnd;
                    if (contentStart < node.to) {
                        decorations.push(
                            Decoration.mark({
                                class: `cm-list-${listLevel}`,
                                tagName: 'span'
                            }).range(contentStart, node.to)
                        );
                    }
                }
            }
        }
    });

    return decorations;
}

export const proseListMarkPlugin = StateField.define<DecorationSet>({
    create(state) {
        return RangeSet.of(buildDecorations(state), true);
    },
    update(value, tr) {
        if (tr.docChanged || tr.selection) {
            return RangeSet.of(buildDecorations(tr.state), true);
        }
        return value.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});