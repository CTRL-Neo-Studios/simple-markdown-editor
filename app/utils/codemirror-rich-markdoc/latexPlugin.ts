import { EditorView, ViewPlugin, Decoration, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { StateField, type Extension, type EditorState } from '@codemirror/state'
import katex from 'katex'

class LatexWidget extends WidgetType {
  constructor (private readonly content: string) {
    super()
  }

  toDOM (view: EditorView): HTMLElement {
    const container = document.createElement('div')
    katex.render(this.content, container, {
      throwOnError: false,
      displayMode: true
    })

    container.addEventListener('click', () => {
      const pos = view.posAtDOM(container)
      const tree = syntaxTree(view.state)
      const node = tree.resolve(pos)
      if (node.name === 'TexBlock') {
        view.dispatch({
          selection: { anchor: node.from, head: node.to }
        })
      }
    })

    return container
  }
}

function decorate (state: EditorState): DecorationSet {
  const decorations: any[] = []
  const tree = syntaxTree(state)
  const cursor = state.selection.main
  tree.iterate({
    enter: (node) => {
      if (node.name === 'TexBlock') {
        const isNodeRangeActive = (nodeFrom: number, nodeTo: number): boolean => {
          if (cursor.empty) {
            return cursor.from >= nodeFrom && cursor.from <= nodeTo
          } else {
            return Math.max(nodeFrom, cursor.from) < Math.min(nodeTo, cursor.to)
          }
        }

        if (isNodeRangeActive(node.from, node.to)) {
          return
        }

        const content = state.doc.sliceString(node.from + 2, node.to - 2)
        const nodeText = state.doc.sliceString(node.from, node.to)
        const hasLineBreaks = nodeText.includes('\n')

        if (hasLineBreaks) {
          // For multi-line blocks, first add the mark decoration (comes first positionally)
          decorations.push(Decoration.mark({ class: 'cm-hidden-latex' }).range(node.from, node.to))
          
          // Then add the widget at the end of the line (comes after)
          const line = state.doc.lineAt(node.to)
          const widget = Decoration.widget({
            widget: new LatexWidget(content),
            block: true,
            side: 1
          })
          decorations.push(widget.range(line.to))
        } else {
          // For single-line blocks, use replace as before
          const deco = Decoration.replace({
            widget: new LatexWidget(content)
          })
          decorations.push(deco.range(node.from, node.to))
        }
      }
    }
  })
  return Decoration.set(decorations)
}

function decorateInline (view: EditorView) {
  const decorations: any[] = []
  const tree = syntaxTree(view.state)
  const cursor = view.state.selection.main
  tree.iterate({
    enter: (node) => {
      if (node.name === 'TexInline') {
        const isNodeRangeActive = (nodeFrom: number, nodeTo: number): boolean => {
          if (cursor.empty) {
            return cursor.from >= nodeFrom && cursor.from <= nodeTo
          } else {
            return Math.max(nodeFrom, cursor.from) < Math.min(nodeTo, cursor.to)
          }
        }

        if (isNodeRangeActive(node.from, node.to)) {
          return
        }

        const content = view.state.doc.sliceString(node.from + 1, node.to - 1)
        const deco = Decoration.replace({
          widget: new InlineLatexWidget(content)
        })
        decorations.push(deco.range(node.from, node.to))
      }
    }
  })
  return Decoration.set(decorations)
}

class InlineLatexWidget extends WidgetType {
  constructor (private readonly content: string) {
    super()
  }

  toDOM (view: EditorView): HTMLElement {
    const container = document.createElement('span')
    katex.render(this.content, container, {
      throwOnError: false
    })

    container.addEventListener('click', () => {
      const pos = view.posAtDOM(container)
      const tree = syntaxTree(view.state)
      const node = tree.resolve(pos)
      if (node.name === 'TexInline') {
        view.dispatch({
          selection: { anchor: node.from, head: node.to }
        })
      }
    })

    return container
  }
}

export const latexBlockPlugin = StateField.define<DecorationSet>({
  create(state) {
    return decorate(state)
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return decorate(tr.state)
    }
    return value.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f)
})

export const latexInlinePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor (view: EditorView) {
      this.decorations = decorateInline(view)
    }

    update (update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = decorateInline(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations
  }
)

export function latex(): Extension {
  return [
    latexBlockPlugin,
    latexInlinePlugin
  ]
} 