import type { Component } from 'solid-js'
import { onMount, onCleanup, createEffect } from 'solid-js'
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { automataYaml } from './automata-lang'
import { getThemeExtension } from '../utils/EditorThemes'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language'
import { appState, setAppState } from '../store/AppStore'
import './CodeEditor.css'

// Create basic setup extensions manually
const basicSetupExtensions = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap
  ])
]

export const CodeEditor: Component = () => {
  let editorRef: HTMLDivElement | undefined
  let view: EditorView | undefined

  onMount(() => {
    if (!editorRef) return

    // Create the editor state with YAML syntax highlighting
    const startState = EditorState.create({
      doc: appState.editorContent,
      extensions: [
        basicSetupExtensions,
        automataYaml(),
        // Theme based on appState.theme
        getThemeExtension(appState.theme),
        // Update our store when content changes
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const value = update.state.doc.toString()
            setAppState('editorContent', value)
          }
        }),
        // Basic editor configuration
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { padding: "10px" }
        })
      ]
    })

    // Create the editor view
    view = new EditorView({
      state: startState,
      parent: editorRef
    })
  })

  // Update editor content when store changes (from external sources)
  createEffect(() => {
    const content = appState.editorContent
    if (view && view.state.doc.toString() !== content) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content
        }
      })
    }
  })

  // Update theme when it changes
  createEffect(() => {
    if (view) {
      // To change theme, we need to recreate the entire state
      const newState = EditorState.create({
        doc: view.state.doc,
        extensions: [
          basicSetupExtensions,
          automataYaml(),
          getThemeExtension(appState.theme),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const value = update.state.doc.toString()
              setAppState('editorContent', value)
            }
          }),
          EditorView.theme({
            "&": { height: "100%" },
            ".cm-scroller": { overflow: "auto" },
            ".cm-content": { padding: "10px" }
          })
        ]
      })
      view.setState(newState)
    }
  })


  onCleanup(() => {
    view?.destroy()
  })

  return (
    <div class="code-editor-container">
      <div class="code-editor" ref={editorRef} />
    </div>
  )
}