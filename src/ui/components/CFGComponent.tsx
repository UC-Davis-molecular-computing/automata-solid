import type { Component } from 'solid-js'
import { createEffect, Show, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'
import { CFG } from '../../core/CFG'
import { CFGParser } from '../../parsers/CFGParser'
import { appState, dispatch } from '../store/AppStore'
import { SetComputationResult, SetParseError } from '../types/Messages'
import './TableComponent.css'

interface CFGComponentProps {
  onRunReady?: (runFunction: () => void) => void
}

interface CFGComponentState {
  cfg: CFG | null
  error: string | null
  accepted: boolean
  parseTree: string | null
  hasResult: boolean // Whether computation has been run and result should be shown
  lastComputedInput: string // Track the input string that was last computed
}

export const CFGComponent: Component<CFGComponentProps> = (props) => {
  // Local component state
  const [state, setState] = createStore<CFGComponentState>({
    cfg: null,
    error: null,
    accepted: false,
    parseTree: null,
    hasResult: false,
    lastComputedInput: ''
  })

  // Function to run the computation
  const runComputation = () => {
    try {
      // Parse the CFG from YAML
      const parser = new CFGParser()
      const cfg = parser.parseCFG(appState.editorContent)
      
      // Test the input string
      const accepted = cfg.accepts(appState.inputString)
      const parseTree = accepted ? cfg.parseTree(appState.inputString)?.toTreeString() || undefined : undefined
      
      setState({
        cfg,
        error: null,
        accepted,
        parseTree,
        hasResult: true,
        lastComputedInput: appState.inputString
      })
      
      // Dispatch computation result to global store
      dispatch(new SetComputationResult({
        accepts: accepted,
        outputString: parseTree // CFGs can have parse tree output
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error parsing CFG'
      setState({
        cfg: null,
        error: errorMessage,
        hasResult: false
      })
      
      // Dispatch parse error to global store
      dispatch(new SetParseError(errorMessage))
    }
  }

  // Parse CFG and conditionally process input based on runImmediately setting
  createEffect(() => {
    // Always try to parse the CFG for validation
    try {
      const parser = new CFGParser()
      const cfg = parser.parseCFG(appState.editorContent)
      
      if (appState.runImmediately) {
        // Run computation immediately
        runComputation()
      } else {
        // Just parse and show structure, but don't compute results
        // Reset hasResult when content changes
        setState({
          cfg,
          error: null,
          hasResult: false
        })
        
        // Clear parse errors when content changes in manual mode
        dispatch(new SetParseError(null))
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error parsing CFG'
      setState({
        cfg: null,
        error: errorMessage,
        hasResult: false
      })
      
      // Dispatch parse error to global store
      dispatch(new SetParseError(errorMessage))
    }
  })

  // Reset computation results when test input changes in manual mode
  createEffect(() => {
    // Only reset if the input string actually changed since last computation
    const currentInput = appState.inputString
    if (!appState.runImmediately && state.cfg && state.hasResult && 
        currentInput !== state.lastComputedInput) {
      setState({
        hasResult: false
      })
    }
  })

  // Results are now dispatched to global store instead of using callbacks

  // Export run function once on mount
  onMount(() => {
    // Export run function for manual mode
    if (props.onRunReady) {
      props.onRunReady(runComputation)
    }
  })

  return (
    <div class="dfa-table-component">
      <Show when={state.error}>
        <div class="error-message">
          <strong>Error:</strong>
          <pre class="error-text">{state.error}</pre>
        </div>
      </Show>

      <Show when={state.cfg && !state.error}>
        <div class="dfa-content">
          {/* Parse Tree Display */}
          <Show when={state.hasResult && state.accepted && state.parseTree}>
            <div class="cfg-parse-tree">
              <h3>Parse Tree</h3>
              <div class="parse-tree-display">
                <pre><code>{state.parseTree}</code></pre>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}