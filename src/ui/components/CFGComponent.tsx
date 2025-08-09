import type { Component } from 'solid-js'
import { createEffect, Show, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'
import { CFG } from '../../core/CFG'
import { appState, dispatch } from '../store/AppStore'
import { SetComputationResult, SetParseError } from '../types/Messages'
import './TableComponent.css'

interface CFGComponentProps {
  cfg: CFG
  onRunReady?: (runFunction: () => void) => void
}

interface CFGComponentState {
  accepted: boolean
  parseTree: string | null
  hasResult: boolean // Whether computation has been run and result should be shown
  lastComputedInput: string // Track the input string that was last computed
}

export const CFGComponent: Component<CFGComponentProps> = (props) => {
  // Local component state
  const [state, setState] = createStore<CFGComponentState>({
    accepted: false,
    parseTree: null,
    hasResult: false,
    lastComputedInput: ''
  })

  // Function to run the computation
  const runComputation = () => {
    try {
      // Test the input string
      const accepted = props.cfg.accepts(appState.inputString)
      const parseTree = accepted ? props.cfg.parseTree(appState.inputString)?.toTreeString() || undefined : undefined
      
      setState({
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during computation'
      dispatch(new SetParseError(errorMessage))
    }
  }

  // Run computation immediately if enabled
  createEffect(() => {
    if (appState.runImmediately) {
      runComputation()
    }
  })

  // Reset computation results when test input changes in manual mode
  createEffect(() => {
    // Only reset if the input string actually changed since last computation
    const currentInput = appState.inputString
    if (!appState.runImmediately && state.hasResult && 
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
    </div>
  )
}