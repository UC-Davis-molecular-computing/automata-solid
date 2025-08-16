import type { Component } from 'solid-js'
import { createEffect, For, Show, onMount, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { NFA } from '../../core/NFA'
import { appState, setAppState, dispatch } from '../store/AppStore'
import { RegisterNavigationControls } from '../types/Messages'
import { PanZoomSVG } from './PanZoomSVG'
import * as Viz from '@viz-js/viz'
import './TableComponent.css'

interface NFAComponentProps {
  nfa: NFA
  isGraphView?: boolean
}

interface NFAComponentState {
  currentPosition: number
}

export const NFAComponent: Component<NFAComponentProps> = (props) => {
  // Local component state (only navigation position)
  const [state, setState] = createStore<NFAComponentState>({
    currentPosition: 0
  })

  // Graph rendering state
  const [vizInstance, setVizInstance] = createSignal<any>(null)
  const [graphSvg, setGraphSvg] = createSignal<SVGElement | null>(null)

  // Initialize viz-js instance
  onMount(async () => {
    try {
      const viz = await Viz.instance()
      setVizInstance(viz)
    } catch (error) {
      console.error('Failed to initialize Viz.js:', error)
    }
  })
  
  // Derived values from AppState (single source of truth)
  const hasResult = () => appState.computation?.navigation?.executionData !== undefined

  // Computation is now triggered via message dispatch from App.tsx

  // Get stateSetsVisited from appState computation - only call when hasResult() is true  
  const stateSetsVisited = () => {
    if (appState.computation?.navigation?.executionData?.type === 'nfa') {
      return appState.computation.navigation.executionData?.stateSetsVisited
    }
    // This should not happen if caller checks hasResult() first
    throw new Error('stateSetsVisited() called when NFA execution data not available')
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
  const getCurrentStateSet = () => {
    if (!hasResult()) return []
    
    const visited = stateSetsVisited()
    if (!visited || !visited.length) return []
    return visited[state.currentPosition] || []
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

  // Generate DOT graph description for the NFA
  const generateDotGraph = () => {
    const currentStateSet = getCurrentStateSet()
    const currentSymbol = getCurrentSymbol()
    
    let dot = 'digraph NFA {\n'
    dot += '  rankdir=LR;\n'
    dot += '  node [shape=circle];\n'
    
    // Add invisible start node and arrow to start state
    dot += '  start [shape=point, style=invisible];\n'
    dot += `  start -> "${props.nfa.startState}";\n`
    
    // Add states with highlighting
    props.nfa.states.forEach(stateName => {
      const isAccepting = props.nfa.acceptStates.includes(stateName)
      const isCurrent = hasResult() && currentStateSet.includes(stateName)
      
      let nodeAttrs = []
      if (isAccepting) {
        nodeAttrs.push('shape=doublecircle')
      }
      if (isCurrent) {
        nodeAttrs.push('style=filled', 'fillcolor=lightblue')
      }
      
      const attrs = nodeAttrs.length > 0 ? ` [${nodeAttrs.join(', ')}]` : ''
      dot += `  "${stateName}"${attrs};\n`
    })
    
    // Add transitions with highlighting
    props.nfa.states.forEach(fromState => {
      // Regular transitions
      props.nfa.inputAlphabet.forEach(symbol => {
        const key = `${fromState},${symbol}`
        const toStates = props.nfa.delta[key]
        if (toStates && toStates.length > 0) {
          const isCurrentTransition = hasResult() && 
            currentStateSet.includes(fromState) && 
            symbol === currentSymbol
          
          toStates.forEach(toState => {
            let edgeAttrs = [`label="${symbol}"`]
            if (isCurrentTransition) {
              edgeAttrs.push('color=red', 'penwidth=2')
            }
            
            const attrs = edgeAttrs.length > 0 ? ` [${edgeAttrs.join(', ')}]` : ''
            dot += `  "${fromState}" -> "${toState}"${attrs};\n`
          })
        }
      })
      
      // Epsilon transitions (not highlighted as per requirements)
      const epsilonKey = `${fromState},`
      const epsilonStates = props.nfa.delta[epsilonKey]
      if (epsilonStates && epsilonStates.length > 0) {
        epsilonStates.forEach(toState => {
          dot += `  "${fromState}" -> "${toState}" [label="ε", style=dashed];\n`
        })
      }
    })
    
    dot += '}\n'
    return dot
  }

  // Effect to update graph when state changes
  createEffect(() => {
    if (props.isGraphView && vizInstance()) {
      try {
        const dot = generateDotGraph()
        const svg = vizInstance().renderSVGElement(dot)
        
        // Let the SVG maintain its intrinsic size and aspect ratio
        // The PanZoomSVG container will handle the sizing constraints
        svg.removeAttribute('width')
        svg.removeAttribute('height')
        svg.style.maxWidth = '100%'
        svg.style.maxHeight = '100%'
        svg.style.height = 'auto'
        svg.style.width = 'auto'
        
        setGraphSvg(svg)
      } catch (error) {
        console.error('Failed to render graph:', error)
      }
    }
  })

  return (
    <div class="automaton-component">
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

        {/* Table View */}
        <Show when={!props.isGraphView}>
          <div class="table-view-content">
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
        </Show>

        {/* Graph View */}
        <Show when={props.isGraphView}>
          <div class="graph-view-content">
            <Show when={graphSvg()} fallback={<div>Loading graph...</div>}>
              <PanZoomSVG
                svgElement={graphSvg()}
                maxScale={5}
                minScale={0.3}
              >
                {graphSvg()}
              </PanZoomSVG>
            </Show>
          </div>
        </Show>
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