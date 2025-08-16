import type { Component } from 'solid-js'
import { createEffect, For, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { DFA } from '../../core/DFA'
import { appState, setAppState, dispatch } from '../store/AppStore'
import { RegisterNavigationControls } from '../types/Messages'
import './TableComponent.css'

interface DFAComponentProps {
  dfa: DFA
}

interface DFAComponentState {
  currentPosition: number
}

export const DFAComponent: Component<DFAComponentProps> = (props) => {
  // Local component state (only navigation position)
  const [state, setState] = createStore<DFAComponentState>({
    currentPosition: 0,
  })

  // Derived values from AppState (single source of truth)
  const hasResult = () => appState.computation !== undefined

  // Computation is now triggered via message dispatch from App.tsx

  // Get statesVisited from appState computation - only call when hasResult() is true
  const statesVisited = () => {
    if (appState.computation?.navigation?.executionData?.type === 'dfa') {
      return appState.computation.navigation.executionData?.statesVisited
    }
    // This should not happen if caller checks hasResult() first
    throw new Error('statesVisited() called when DFA execution data not available')
  }

  // Reset position when result changes
  createEffect(() => {
    if (hasResult()) {
      setState({ currentPosition: 0 })
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

  // Register navigation controls with the store on mount
  onMount(() => {
    dispatch(new RegisterNavigationControls({
      goForward,
      goBackward,
      goToBeginning,
      goToEnd,
      canGoForward: () => hasResult() && state.currentPosition < appState.inputString.length,
      canGoBackward: () => hasResult() && state.currentPosition > 0
    }))
  })


  // Helper functions for rendering
  const getCurrentState = () => {
    if (!hasResult()) return ''
    
    const visited = statesVisited()
    if (!visited || !visited.length) return ''
    return visited[state.currentPosition] || ''
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

  return (
    <div class="automaton-table-component">
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
                <th class="transition_header_entry" colspan={props.dfa.inputAlphabet.length} style="text-align: left;">Transitions</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.dfa.states}>
                {(stateName) => (
                  <TransitionRow
                    dfa={props.dfa}
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
    </div>
  )
}

// Separate component for each transition row
interface TransitionRowProps {
  dfa: DFA
  stateName: string
  currentState: string
  currentSymbol?: string
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