import type { Component } from 'solid-js'
import { createEffect, For, Show, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'
import { NFA } from '../../core/NFA'
import { appState, setAppState } from '../store/AppStore'
import type { NavigationControls } from '../types/NavigationControls'
import './TableComponent.css'

interface NFAComponentProps {
  nfa: NFA
  onNavigationReady?: (controls: NavigationControls) => void
}

interface NFAComponentState {
  currentPosition: number
  stateSetsVisited: string[][] // Array of state sets (NFA can be in multiple states)
}

export const NFAComponent: Component<NFAComponentProps> = (props) => {
  // Local component state (only NFA-specific state)
  const [state, setState] = createStore<NFAComponentState>({
    currentPosition: 0,
    stateSetsVisited: []
  })
  
  // Derived values from AppState (single source of truth)
  const hasResult = () => appState.computation !== undefined

  // Computation is now triggered via message dispatch from App.tsx

  // Update stateSetsVisited when result changes (for both manual and immediate modes)
  createEffect(() => {
    if (hasResult()) {
      try {
        const stateSetsVisited = props.nfa.stateSetsVisited(appState.inputString)
        setState({
          currentPosition: 0,
          stateSetsVisited
        })
      } catch {
        // If we can't compute states visited, reset
        setState({
          currentPosition: 0,
          stateSetsVisited: []
        })
      }
    }
  })

  // Clear results and reset position when inputString changes in manual mode  
  createEffect((prevInput) => {
    const currentInput = appState.inputString
    
    // Only clear results if input actually changed and we're in manual mode
    if (!appState.runImmediately && hasResult() && 
        prevInput !== undefined && prevInput !== currentInput) {
      setState({
        currentPosition: 0
      })
      setAppState('computation', undefined)
    }
    
    return currentInput
  })

  // Results are now dispatched to global store instead of using callbacks

  // Effect to handle manual run test triggers  
  // We'll need a different approach since appState.result is not the right trigger
  // For now, let's remove this and add a more direct approach

  // Navigation functions (exported for use by parent component)
  const goForward = () => {
    if (!hasResult()) return
    setState({
      currentPosition: Math.min(state.currentPosition + 1, appState.inputString.length)
    })
  }

  const goBackward = () => {
    if (!hasResult()) return
    setState({
      currentPosition: Math.max(state.currentPosition - 1, 0)
    })
  }

  const goToBeginning = () => {
    if (!hasResult()) return
    setState({
      currentPosition: 0
    })
  }

  const goToEnd = () => {
    if (!hasResult()) return
    setState({
      currentPosition: appState.inputString.length
    })
  }

  // Export navigation functions once on mount - functions are stable
  onMount(() => {
    if (props.onNavigationReady) {
      props.onNavigationReady({
        goForward,
        goBackward, 
        goToBeginning,
        goToEnd,
        canGoForward: () => hasResult() && state.currentPosition < appState.inputString.length,
        canGoBackward: () => hasResult() && state.currentPosition > 0
      })
    }
  })

  // Helper functions for rendering
  const getCurrentStateSet = () => {
    if (!hasResult() || !state.stateSetsVisited.length) return []
    return state.stateSetsVisited[state.currentPosition] || []
  }

  const getCurrentSymbol = () => {
    if (!hasResult() || !appState.inputString.length) return undefined
    return state.currentPosition < appState.inputString.length 
      ? appState.inputString[state.currentPosition] 
      : undefined
  }

  // Format input string with position indicator
  const formatInputWithPosition = () => {
    if (!hasResult()) {
      // When computation hasn't been run, just show the input string without position indicator
      return appState.inputString || '(empty)'
    }
    const processed = appState.inputString.slice(0, state.currentPosition)
    const remaining = appState.inputString.slice(state.currentPosition)
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
            <Show when={hasResult()}>
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
  currentSymbol?: string
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
      return undefined
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