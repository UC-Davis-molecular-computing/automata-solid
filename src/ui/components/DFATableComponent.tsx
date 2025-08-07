import type { Component } from 'solid-js'
import { createEffect, For, Show, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'
import { DFA } from '../../core/DFA'
import { assert } from '../../core/Utils'
import { DFAParser } from '../../parsers/DFAParser'
import { appState, dispatch } from '../store/AppStore'
import { SetComputationResult, SetParseError } from '../types/Messages'
import './TableComponent.css'

interface NavigationControls {
  goForward: () => void
  goBackward: () => void
  goToBeginning: () => void
  goToEnd: () => void
  canGoForward: () => boolean
  canGoBackward: () => boolean
}

interface DFATableComponentProps {
  onNavigationReady?: (controls: NavigationControls) => void
  onRunReady?: (runFunction: () => void) => void
}

interface DFATableComponentState {
  dfa: DFA | null
  error: string | null
  currentPosition: number
  statesVisited: string[]
  inputSymbols: string[]
  accepted: boolean
  hasResult: boolean // Whether computation has been run and result should be shown
  lastComputedInput: string // Track the input string that was last computed
}

export const DFATableComponent: Component<DFATableComponentProps> = (props) => {
  // Local component state
  const [state, setState] = createStore<DFATableComponentState>({
    dfa: null,
    error: null,
    currentPosition: 0,
    statesVisited: [],
    inputSymbols: [],
    accepted: false,
    hasResult: false,
    lastComputedInput: ''
  })

  // Function to run the computation
  const runComputation = () => {
    try {
      // Parse the DFA from YAML
      const parser = new DFAParser()
      const dfa = parser.parseDFA(appState.editorContent)
      
      // Process the test input
      const statesVisited = dfa.statesVisited(appState.inputString)
      const inputSymbols = Array.from(appState.inputString)
      const accepted = dfa.accepts(appState.inputString)
      
      setState({
        dfa,
        error: null,
        currentPosition: 0,
        statesVisited,
        inputSymbols,
        accepted,
        hasResult: true,
        lastComputedInput: appState.inputString
      })
      
      // Dispatch computation result to global store
      dispatch(new SetComputationResult({
        accepts: accepted,
        outputString: null // DFAs don't have output strings
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error parsing DFA'
      setState({
        dfa: null,
        error: errorMessage,
        hasResult: false
      })
      
      // Dispatch parse error to global store
      dispatch(new SetParseError(errorMessage))
    }
  }

  // Parse DFA and conditionally process input based on runImmediately setting
  createEffect(() => {
    // Always try to parse the DFA for validation
    try {
      const parser = new DFAParser()
      const dfa = parser.parseDFA(appState.editorContent)
      
      if (appState.runImmediately) {
        // Run computation immediately
        runComputation()
      } else {
        // Just parse and show structure, but don't compute results
        // Reset hasResult when YAML content changes
        setState({
          dfa,
          error: null,
          hasResult: false
        })
        
        // Clear computation results when YAML changes in manual mode
        dispatch(new SetParseError(null))
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error parsing DFA'
      setState({
        dfa: null,
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
      if (!appState.runImmediately && state.dfa && state.hasResult && 
          currentInput !== state.lastComputedInput) {
        setState({
          hasResult: false,
          currentPosition: 0
        })
      }
    })

    // Results are now dispatched to global store instead of using callbacks

  // Effect to handle manual run test triggers  
  // We'll need a different approach since appState.result is not the right trigger
  // For now, let's remove this and add a more direct approach

  // Navigation functions (exported for use by parent component)
  // These are always available but include safety checks
  const goForward = () => {
    if (!state.dfa || state.error || !state.hasResult) return // Safety guard
    setState({
      currentPosition: Math.min(state.currentPosition + 1, state.inputSymbols.length)
    })
  }

  const goBackward = () => {
    if (!state.dfa || state.error || !state.hasResult) return // Safety guard
    setState({
      currentPosition: Math.max(state.currentPosition - 1, 0)
    })
  }

  const goToBeginning = () => {
    if (!state.dfa || state.error || !state.hasResult) return // Safety guard
    setState({
      currentPosition: 0
    })
  }

  const goToEnd = () => {
    if (!state.dfa || state.error || !state.hasResult) return // Safety guard
    setState({
      currentPosition: state.inputSymbols.length
    })
  }

  // Export navigation functions and run function once on mount - functions are stable
  onMount(() => {
    if (props.onNavigationReady) {
      props.onNavigationReady({
        goForward,
        goBackward, 
        goToBeginning,
        goToEnd,
        // These check both DFA validity, hasResult AND position
        canGoForward: () => !!(state.dfa && !state.error && state.hasResult && state.currentPosition < state.inputSymbols.length),
        canGoBackward: () => !!(state.dfa && !state.error && state.hasResult && state.currentPosition > 0)
      })
    }
    
    // Export run function for manual mode
    if (props.onRunReady) {
      props.onRunReady(runComputation)
    }
  })


  // Helper functions for rendering
  const getCurrentState = () => {
    if (!state.hasResult || !state.statesVisited.length) return ''
    return state.statesVisited[state.currentPosition] || ''
  }

  const getCurrentSymbol = () => {
    if (!state.hasResult || !state.inputSymbols.length) return null
    return state.currentPosition < state.inputSymbols.length 
      ? state.inputSymbols[state.currentPosition] 
      : null
  }


  // Format input string with position indicator
  const formatInputWithPosition = () => {
    if (!state.hasResult) {
      // When computation hasn't been run, just show the input string without position indicator
      return appState.inputString || '(empty)'
    }
    const processed = state.inputSymbols.slice(0, state.currentPosition).join('')
    const remaining = state.inputSymbols.slice(state.currentPosition).join('')
    return `${processed}^${remaining}`
  }

  return (
    <div class="automaton-table-component">
      <Show when={state.error}>
        <div class="error-message">
          <strong>Error:</strong>
          <pre class="error-text">{state.error}</pre>
        </div>
      </Show>

      <Show when={state.dfa && !state.error}>
        <div class="automaton-content">
        {/* Compact Input Display */}
        <div class="input-display">
          <div class="input-status-line">
            <span class="input-processed" style="font-family: Consolas, monospace">
              {formatInputWithPosition()}
            </span>
          </div>
        </div>

        {/* Transition Table */}
        <div class="transition-table-container">
          <table id="transition_table" class="transition-table">
            <thead>
              <tr id="transition_table_head">
                <th class="transition_header_entry">State</th>
                <th class="transition_header_entry" colspan={(() => { assert(state.dfa, 'DFA should be defined'); return state.dfa.inputAlphabet.length })()} style="text-align: left;">Transitions</th>
              </tr>
            </thead>
            <tbody>
              <For each={(() => { assert(state.dfa, 'DFA should be defined'); return state.dfa.states })()}>
                {(stateName) => (
                  <TransitionRow 
                    dfa={(() => { assert(state.dfa, 'DFA should be defined'); return state.dfa })()}
                    stateName={stateName}
                    currentState={getCurrentState()}
                    currentSymbol={getCurrentSymbol()}
                  />
                )}
              </For>
            </tbody>
          </table>
        </div>
        </div>
      </Show>
    </div>
  )
}

// Separate component for each transition row
interface TransitionRowProps {
  dfa: DFA
  stateName: string
  currentState: string
  currentSymbol: string | null
}

const TransitionRow: Component<TransitionRowProps> = (props) => {
  const isCurrentState = () => props.stateName === props.currentState
  const isAcceptState = () => {
    return props.dfa.acceptStates.includes(props.stateName)
  }

  return (
    <tr 
      id={`transition-row-${props.stateName}`}
    >
      {/* State Cell */}
      <td 
        class="state-cell"
      >
        <div class={`transition-table-entry state-entry ${isAcceptState() ? 'accepting' : 'rejecting'} ${isCurrentState() ? 'current' : ''}`}>
          {props.stateName}
        </div>
      </td>
      
      {/* Individual Transition Cells */}
      <For each={props.dfa.inputAlphabet}>
        {(symbol) => (
          <td class="transition-cell">
            <TransitionEntry
              dfa={props.dfa}
              state={props.stateName}
              symbol={symbol}
              isCurrentTransition={isCurrentState() && props.currentSymbol === symbol}
            />
          </td>
        )}
      </For>
    </tr>
  )
}

// Individual transition entry component
interface TransitionEntryProps {
  dfa: DFA
  state: string
  symbol: string
  isCurrentTransition: boolean
}

const TransitionEntry: Component<TransitionEntryProps> = (props) => {
  const getTransitionText = () => {
    try {
      return props.dfa.transitionStr(props.state, props.symbol)
    } catch {
      return `${props.symbol} → ?`
    }
  }

  return (
    <span 
      class={`transition-table-entry transition-entry ${props.isCurrentTransition ? 'current' : ''}`}
    >
      {getTransitionText()}
    </span>
  )
}