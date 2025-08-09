import type { Component } from 'solid-js'
import { createEffect, For, Show, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'
import { NFA } from '../../core/NFA'
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

interface NFAComponentProps {
  nfa: NFA
  onNavigationReady?: (controls: NavigationControls) => void
  onRunReady?: (runFunction: () => void) => void
}

interface NFAComponentState {
  currentPosition: number
  stateSetsVisited: string[][] // Array of state sets (NFA can be in multiple states)
  inputSymbols: string[]
  accepted: boolean
  hasResult: boolean // Whether computation has been run and result should be shown
  lastComputedInput: string // Track the input string that was last computed
}

export const NFAComponent: Component<NFAComponentProps> = (props) => {
  // Local component state
  const [state, setState] = createStore<NFAComponentState>({
    currentPosition: 0,
    stateSetsVisited: [],
    inputSymbols: [],
    accepted: false,
    hasResult: false,
    lastComputedInput: ''
  })

  // Function to run the computation
  const runComputation = () => {
    try {
      // Process the test input
      const stateSetsVisited = props.nfa.stateSetsVisited(appState.inputString)
      const inputSymbols = Array.from(appState.inputString)
      const accepted = props.nfa.accepts(appState.inputString)
      
      setState({
        currentPosition: 0,
        stateSetsVisited,
        inputSymbols,
        accepted,
        hasResult: true,
        lastComputedInput: appState.inputString
      })
      
      // Dispatch computation result to global store
      dispatch(new SetComputationResult({
        accepts: accepted,
        outputString: undefined // NFAs don't have output strings
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
        hasResult: false,
        currentPosition: 0
      })
    }
  })

  // Results are now dispatched to global store instead of using callbacks

  // Navigation functions (exported for use by parent component)
  const goForward = () => {
    if (!state.hasResult) return
    setState({
      currentPosition: Math.min(state.currentPosition + 1, state.inputSymbols.length)
    })
  }

  const goBackward = () => {
    if (!state.hasResult) return
    setState({
      currentPosition: Math.max(state.currentPosition - 1, 0)
    })
  }

  const goToBeginning = () => {
    if (!state.hasResult) return
    setState({
      currentPosition: 0
    })
  }

  const goToEnd = () => {
    if (!state.hasResult) return
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
        canGoForward: () => state.hasResult && state.currentPosition < state.inputSymbols.length,
        canGoBackward: () => state.hasResult && state.currentPosition > 0
      })
    }
    
    // Export run function for manual mode
    if (props.onRunReady) {
      props.onRunReady(runComputation)
    }
  })

  // Helper functions for rendering
  const getCurrentStateSet = () => {
    if (!state.hasResult || !state.stateSetsVisited.length) return []
    return state.stateSetsVisited[state.currentPosition] || []
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

  // Format current state set for display
  const formatCurrentStateSet = () => {
    const stateSet = getCurrentStateSet()
    if (stateSet.length === 0) return '∅'
    if (stateSet.length === 1) return stateSet[0]
    return `{${stateSet.join(', ')}}`
  }

  return (
    <div class="automaton-table-component">
      <div class="automaton-content">
        {/* Compact Input Display */}
        <div class="input-display">
          <div class="input-status-line">
            <span class="input-processed" style="font-family: Consolas, monospace">
              {formatInputWithPosition()}
            </span>
            <Show when={state.hasResult}>
              <span class="current-states">
                Current states: <span class="state-set">{formatCurrentStateSet()}</span>
              </span>
            </Show>
          </div>
        </div>

        {/* Transition Table */}
        <div class="transition-table-container">
          <table id="transition_table" class="transition-table">
            <thead>
              <tr id="transition_table_head">
                <th class="transition_header_entry">State</th>
                <th class="transition_header_entry" colspan={props.nfa.inputAlphabet.length + 1} style="text-align: left;">Transitions</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.nfa.states}>
                {(stateName) => (
                  <NFATransitionRow 
                    nfa={props.nfa}
                    stateName={stateName}
                    currentStates={getCurrentStateSet()}
                    currentSymbol={getCurrentSymbol()}
                  />
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Separate component for each transition row
interface NFATransitionRowProps {
  nfa: NFA
  stateName: string
  currentStates: string[]
  currentSymbol: string | null
}

const NFATransitionRow: Component<NFATransitionRowProps> = (props) => {
  const isCurrentState = () => props.currentStates.includes(props.stateName)
  const isAcceptState = () => {
    return props.nfa.acceptStates.includes(props.stateName)
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
      
      {/* Individual Transition Cells for Input Alphabet */}
      <For each={props.nfa.inputAlphabet}>
        {(symbol) => (
          <td class="transition-cell">
            <NFATransitionEntry
              nfa={props.nfa}
              state={props.stateName}
              symbol={symbol}
              isCurrentTransition={isCurrentState() && props.currentSymbol === symbol}
            />
          </td>
        )}
      </For>
      
      {/* Epsilon Transition Cell */}
      <td class="transition-cell">
        <NFATransitionEntry
          nfa={props.nfa}
          state={props.stateName}
          symbol="" // Empty string for epsilon
          isCurrentTransition={false} // Epsilon transitions aren't "current" in the same way
        />
      </td>
    </tr>
  )
}

// Individual transition entry component
interface NFATransitionEntryProps {
  nfa: NFA
  state: string
  symbol: string
  isCurrentTransition: boolean
}

const NFATransitionEntry: Component<NFATransitionEntryProps> = (props) => {
  const getTransitionText = () => {
    try {
      return props.nfa.transitionStr(props.state, props.symbol)
    } catch {
      // No transition defined for this state-symbol pair
      return null
    }
  }

  const transitionText = getTransitionText()
  
  return (
    <Show when={transitionText} fallback={<span class="no-transition">—</span>}>
      <span 
        class={`transition-table-entry transition-entry ${props.isCurrentTransition ? 'current' : ''}`}
      >
        {transitionText}
      </span>
    </Show>
  )
}