import type { Component } from 'solid-js'
import { createEffect, For, onMount, createSignal, Show } from 'solid-js'
import type { DFA } from '../../core/DFA'
import { deltaKey } from '../../core/Utils'
import { appState, setAppState, dispatch, hasExecutionData } from '../store/AppStore'
import { RegisterNavigationControls } from '../types/Messages'
import { PanZoomSVG } from './PanZoomSVG'
import * as Viz from '@viz-js/viz'
import './TableComponent.css'

interface DFAComponentProps {
  dfa: DFA
  isGraphView?: boolean
}

export const DFAComponent: Component<DFAComponentProps> = (props) => {
  // Navigation state
  const [currentPosition, setCurrentPosition] = createSignal(0)

  // Graph rendering state
  const [vizInstance, setVizInstance] = createSignal<Awaited<ReturnType<typeof Viz.instance>> | undefined>(undefined)
  const [graphSvg, setGraphSvg] = createSignal<SVGElement | undefined>(undefined)

  // Initialize viz-js instance
  onMount(async () => {
    try {
      const viz = await Viz.instance()
      setVizInstance(viz)
    } catch (error) {
      console.error('Failed to initialize Viz.js:', error)
    }
  })

  const statesVisited = () => {
    if (appState.computation?.navigation?.executionData?.type === 'dfa') {
      return appState.computation.navigation.executionData?.statesVisited
    }
    // This should not happen if caller checks hasNavigationData() first
    throw new Error('statesVisited() called when DFA execution data not available')
  }

  // Reset position when result changes
  createEffect(() => {
    if (hasExecutionData()) {
      setCurrentPosition(0)
    }
  })

  // Clear results and reset position when inputString changes in manual mode  
  createEffect((prevInput) => {
    const currentInput = appState.inputString

    // Only clear results if input actually changed and we're in manual mode
    if (!appState.runImmediately && hasExecutionData() &&
      prevInput !== undefined && prevInput !== currentInput) {
      setCurrentPosition(0)
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
    if (!hasExecutionData()) return
    setCurrentPosition(Math.min(currentPosition() + 1, appState.inputString.length))
  }

  const goBackward = () => {
    if (!hasExecutionData()) return
    setCurrentPosition(Math.max(currentPosition() - 1, 0))
  }

  const goToBeginning = () => {
    if (!hasExecutionData()) return
    setCurrentPosition(0)
  }

  const goToEnd = () => {
    if (!hasExecutionData()) return
    setCurrentPosition(appState.inputString.length)
  }

  // Register navigation controls with the store whenever computation changes
  createEffect(() => {
    // Re-register whenever we have a computation result
    if (hasExecutionData()) {
      dispatch(new RegisterNavigationControls({
        goForward,
        goBackward,
        goToBeginning,
        goToEnd,
        canGoForward: () => hasExecutionData() && currentPosition() < appState.inputString.length,
        canGoBackward: () => hasExecutionData() && currentPosition() > 0
      }))
    }
  })


  // Helper functions for rendering
  const getCurrentState = () => {
    if (!hasExecutionData()) return ''

    const visited = statesVisited()
    if (!visited || !visited.length) return ''
    return visited[currentPosition()] || ''
  }

  const getCurrentSymbol = () => {
    if (!hasExecutionData() || !appState.inputString.length) return undefined
    return currentPosition() < appState.inputString.length
      ? appState.inputString[currentPosition()]
      : undefined
  }


  // Format input string with position indicator
  const formatInputWithPosition = () => {
    if (!hasExecutionData()) {
      // When computation hasn't been run, just show the input string without position indicator
      return appState.inputString || '(empty)'
    }
    const processed = appState.inputString.slice(0, currentPosition())
    const remaining = appState.inputString.slice(currentPosition())
    return `${processed}^${remaining}`
  }

  // Generate DOT graph description for the DFA
  const generateDotGraph = () => {
    const currentState = getCurrentState()
    const currentSymbol = getCurrentSymbol()

    let dot = 'digraph DFA {\n'
    dot += '  rankdir=LR;\n'
    dot += '  node [shape=circle];\n'

    // Add invisible start node and arrow to start state
    dot += '  start [shape=point, style=invisible];\n'
    dot += `  start -> "${props.dfa.startState}";\n`

    // Add states with highlighting
    props.dfa.states.forEach(stateName => {
      const isAccepting = props.dfa.acceptStates.includes(stateName)
      const isCurrent = hasExecutionData() && stateName === currentState

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
    props.dfa.states.forEach(fromState => {
      props.dfa.inputAlphabet.forEach(symbol => {
        const toState = props.dfa.delta[deltaKey(fromState, symbol)]
        if (toState) {
          const isCurrentTransition = hasExecutionData() && fromState === currentState && symbol === currentSymbol

          let edgeAttrs = [`label="${symbol}"`]
          if (isCurrentTransition) {
            edgeAttrs.push('color=red', 'penwidth=2')
          }

          const attrs = edgeAttrs.length > 0 ? ` [${edgeAttrs.join(', ')}]` : ''
          dot += `  "${fromState}" -> "${toState}"${attrs};\n`
        }
      })
    })

    dot += '}\n'
    return dot
  }

  // Effect to update graph when state changes
  createEffect(() => {
    if (props.isGraphView && vizInstance()) {
      try {
        const dot = generateDotGraph()
        const viz = vizInstance()
        if (!viz) return
        const svg = viz.renderSVGElement(dot)

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