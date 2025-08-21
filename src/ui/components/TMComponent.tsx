import type { Component } from 'solid-js'
import { createEffect, For, Show, onMount, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { TM, TMConfiguration, ConfigDiff } from '../../core/TM'
import { wildcardMatch, WILDCARD, assert } from '../../core/Utils'
import { appState, setAppState, dispatch, hasExecutionData } from '../store/AppStore'
import { RegisterNavigationControls } from '../types/Messages'
import { PanZoomSVG } from './PanZoomSVG'
import * as Viz from '@viz-js/viz'
import './TableComponent.css' // Reuse existing CSS

interface TMComponentProps {
  tm: TM
  isGraphView?: boolean
}

interface TMComponentState {
  currentStep: number
  diffs: ConfigDiff[]
  initialConfig?: TMConfiguration
  finalConfig?: TMConfiguration
  currentConfig?: TMConfiguration
}

export const TMComponent: Component<TMComponentProps> = (props) => {
  // Local component state (only TM-specific state)
  const [state, setState] = createStore<TMComponentState>({
    currentStep: 0,
    diffs: []
    // initialConfig, finalConfig, currentConfig are undefined by default
  })

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
  
  // Derived values from AppState (single source of truth)

  // Computation is now triggered via message dispatch from App.tsx

  // Update state when global computation changes
  createEffect(() => {
    const computation = appState.computation
    if (computation && computation.navigation?.executionData?.type === 'tm') {
      const tmData = computation.navigation.executionData
      setState({
        currentStep: computation.navigation.currentStep,
        diffs: tmData.diffs as ConfigDiff[],
        initialConfig: tmData.initialConfig as TMConfiguration,
        finalConfig: tmData.finalConfig as TMConfiguration,
        currentConfig: tmData.currentConfig as TMConfiguration
      })
    } else if (!appState.runImmediately) {
      // Just show initial configuration without running computation
      const initialConfig = props.tm.initialConfig(appState.inputString)
      setState({
        initialConfig,
        currentConfig: initialConfig.copy(),
        currentStep: 0,
        diffs: [],
        finalConfig: undefined
      })
    }
  })

  // Clear results and reset state when inputString changes in manual mode  
  createEffect((prevInput) => {
    const currentInput = appState.inputString
    
    // Only clear results if input actually changed and we're in manual mode
    if (!appState.runImmediately && hasExecutionData() && 
        prevInput !== undefined && prevInput !== currentInput) {
      setState({
        currentStep: 0
      })
      setAppState('computation', undefined)
    }
    
    return currentInput
  })


  // Results are now dispatched to global store instead of using callbacks

  // Navigation functions using ConfigDiff approach
  const moveConfigToStep = (newStep: number) => {
    if (!state.currentConfig || !state.diffs) return
    
    if (newStep < 0 || newStep > state.diffs.length) {
      throw new Error(`step must be between 0 and ${state.diffs.length}`)
    }
    
    const currentConfig = state.currentConfig.copy()
    
    if (newStep < state.currentStep) {
      // Move backward using reverse diffs
      for (let i = state.currentStep - 1; i >= newStep; i--) {
        const diff = state.diffs[i]
        currentConfig.applyReverseDiff(diff)
      }
    } else {
      // Move forward using diffs
      for (let i = state.currentStep; i < newStep; i++) {
        const diff = state.diffs[i]
        currentConfig.applyDiff(diff)
      }
    }
    
    setState({
      currentStep: newStep,
      currentConfig
    })
  }

  const goForward = () => {
    if (!hasExecutionData()) return
    const newStep = Math.min(state.currentStep + 1, state.diffs.length)
    moveConfigToStep(newStep)
  }

  const goBackward = () => {
    if (!hasExecutionData()) return
    const newStep = Math.max(state.currentStep - 1, 0)
    moveConfigToStep(newStep)
  }

  const goToBeginning = () => {
    if (!hasExecutionData() || !state.initialConfig) return
    setState({
      currentStep: 0,
      currentConfig: state.initialConfig.copy()
    })
  }

  const goToEnd = () => {
    if (!hasExecutionData() || !state.finalConfig) return
    setState({
      currentStep: state.diffs.length,
      currentConfig: state.finalConfig.copy()
    })
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
        canGoForward: () => hasExecutionData() && state.currentStep < state.diffs.length,
        canGoBackward: () => hasExecutionData() && state.currentStep > 0
      }))
    }
  })

  // Helper functions for rendering
  const getCurrentConfig = () => {
    // Return current config regardless of hasNavigationData status
    return state.currentConfig
  }

  const getCurrentState = () => {
    const config = getCurrentConfig()
    return config ? config.state : ''
  }

  // Generate DOT graph description for the TM
  const generateDotGraph = () => {
    const currentState = getCurrentState()
    const config = getCurrentConfig()
    
    let dot = 'digraph TM {\n'
    dot += '  rankdir=LR;\n'
    dot += '  node [shape=circle];\n'
    
    // Add invisible start node and arrow to start state
    dot += '  start [shape=point, style=invisible];\n'
    dot += `  start -> "${props.tm.startState}";\n`
    
    // Add states with highlighting
    props.tm.states.forEach(stateName => {
      const isAccepting = stateName === props.tm.acceptState
      const isRejecting = stateName === props.tm.rejectState
      const isCurrent = hasExecutionData() && stateName === currentState
      
      let nodeAttrs = []
      if (isAccepting) {
        nodeAttrs.push('shape=doublecircle', 'color=green')
      } else if (isRejecting) {
        nodeAttrs.push('shape=doublecircle', 'color=red')
      }
      if (isCurrent) {
        nodeAttrs.push('style=filled', 'fillcolor=lightblue')
      }
      
      const attrs = nodeAttrs.length > 0 ? ` [${nodeAttrs.join(', ')}]` : ''
      dot += `  "${stateName}"${attrs};\n`
    })
    
    // Add transitions with highlighting
    // Group transitions by from/to states to avoid duplicate edges
    const transitions: Map<string, Array<{inputSymbols: string, label: string}>> = new Map()
    
    Object.entries(props.tm.delta).forEach(([key, [nextState, newSymbols, moveDirections]]) => {
      const [fromState] = key.split(',')
      const transKey = `${fromState}->${nextState}`
      
      if (!transitions.has(transKey)) {
        transitions.set(transKey, [])
      }
      
      // Extract input symbols from key (everything after first comma)
      const inputSymbols = key.substring(fromState.length + 1)
      
      // Create full transition label: "input → output,moves"
      const transitionLabel = `${inputSymbols} → ${newSymbols},${moveDirections}`
      
      const transitionList = transitions.get(transKey)
      assert(transitionList, 'Transition list should exist')
      transitionList.push({
        inputSymbols,
        label: transitionLabel
      })
    })
    
    // Draw transitions
    transitions.forEach((transitionList, transKey) => {
      const [fromState, toState] = transKey.split('->')
      
      // Check if this is the current transition
      let isCurrentTransition = false
      if (hasExecutionData() && fromState === currentState && config) {
        // Check if any of the transitions match the current tape symbols
        const currentSymbols = config.tapes.map((tape, idx) => {
          // Get the symbol at the current head position
          return tape[config.headsPos[idx]] || '_'
        })
        
        isCurrentTransition = transitionList.some(transition => {
          // For multi-tape TMs, inputSymbols is a string like "1_" which needs to be split into individual tape symbols
          // Each character represents a symbol on the corresponding tape
          const symbolArray = transition.inputSymbols.split('')
          const matches = symbolArray.every((sym, i) => 
            sym === WILDCARD || sym === currentSymbols[i]
          )
          return matches
        })
      }
      
      // Create label with all transition information
      const labels = transitionList.map(t => t.label)
      const label = labels.length > 3 
        ? `${labels.slice(0, 3).join('\\n')}...` 
        : labels.join('\\n')
      
      let edgeAttrs = [`label="${label}"`]
      if (isCurrentTransition) {
        edgeAttrs.push('color=red', 'penwidth=2')
      }
      
      const attrs = edgeAttrs.length > 0 ? ` [${edgeAttrs.join(', ')}]` : ''
      dot += `  "${fromState}" -> "${toState}"${attrs};\n`
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
        {/* Tape Display - Always shown for TM */}
        <Show when={state.currentConfig}>
          <div class="tm-tapes-container">
            <h3>Tapes <span class="tm-step-counter">{hasExecutionData() ? `Step ${state.currentStep + 1}/${state.diffs.length + 1}` : 'Initial State'}</span></h3>
            <table class="tm-tapes-table">
              <tbody>
                <For each={Array.from({ length: props.tm.numTapes }, (_, i) => i)}>
                  {(tapeIndex) => (
                    <TMTapeRow 
                      getTape={() => {
                        const cfg = getCurrentConfig()
                        assert(cfg, 'Config should be defined when currentConfig exists')
                        return cfg.tapes[tapeIndex] || []
                      }}
                      getHeadPosition={() => {
                        const cfg = getCurrentConfig()
                        assert(cfg, 'Config should be defined when currentConfig exists')
                        return cfg.headsPos[tapeIndex] || 0
                      }}
                      tapeIndex={tapeIndex}
                    />
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        {/* Table View */}
        <Show when={!props.isGraphView}>
          <div class="table-view-content">
            <div class="transition-table-container">
            <table class="transition-table">
              <thead>
                <tr>
                  <th class="transition_header_entry">State</th>
                  <th class="transition_header_entry">Transitions</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.tm.states}>
                  {(stateName) => (
                    <TMTransitionRow 
                      tm={props.tm}
                      stateName={stateName}
                      currentState={getCurrentState()}
                      currentConfig={getCurrentConfig()}
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
            <PanZoomSVG
              svgElement={graphSvg()}
              maxScale={5}
              minScale={0.3}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}

// Component for displaying transition row
interface TMTransitionRowProps {
  tm: TM
  stateName: string
  currentState: string
  currentConfig?: TMConfiguration
}

const TMTransitionRow: Component<TMTransitionRowProps> = (props) => {
  const isCurrentState = () => props.stateName === props.currentState
  const isAcceptState = () => props.stateName === props.tm.acceptState
  const isRejectState = () => props.stateName === props.tm.rejectState

  const getStateModifierClass = () => {
    if (isAcceptState()) return 'accepting'
    if (isRejectState()) return 'rejecting'
    return '' // No modifier class for regular states
  }

  const getTransitions = () => {
    const statePrefix = `${props.stateName},`
    return Object.entries(props.tm.delta)
      .filter(([key]) => key.startsWith(statePrefix))
      .map(([key, action]) => {
        const symbols = key.slice(statePrefix.length)
        return {
          symbols,
          action,
          display: `${symbols} → ${action.join(',')}`
        }
      })
  }

  const isCurrentTransition = (symbols: string) => {
    if (!isCurrentState() || !props.currentConfig) return false
    
    const scannedSymbols = props.currentConfig.currentScannedSymbols()
    
    // Check if exact match exists (has priority over wildcards) using flattened delta
    const exactKey = `${props.stateName},${scannedSymbols}`
    const hasExactMatch = props.tm.delta.hasOwnProperty(exactKey)
    
    if (symbols === scannedSymbols) {
      // Exact match - always highlight
      return true
    } else if (!hasExactMatch && symbols.includes(WILDCARD) && wildcardMatch(scannedSymbols, symbols)) {
      // Wildcard match - only if no exact match available
      return true
    }
    
    return false
  }

  return (
    <tr>
      <td class="state-cell">
        <div class={`transition-table-entry state-entry ${getStateModifierClass()} ${isCurrentState() ? 'current' : ''}`}>
          {props.stateName}
        </div>
      </td>
      <td class="transition-cell">
        <Show when={getTransitions().length > 0}>
          <table class="tm-transitions-table">
            <tbody>
              <tr>
                <For each={getTransitions()}>
                  {(transition) => (
                    <td class={`transition-table-entry transition-entry ${isCurrentTransition(transition.symbols) ? 'current' : ''}`}>
                      {transition.display}
                    </td>
                  )}
                </For>
              </tr>
            </tbody>
          </table>
        </Show>
      </td>
    </tr>
  )
}

// Component for displaying a single tape row
interface TMTapeRowProps {
  getTape: () => string[]
  getHeadPosition: () => number
  tapeIndex: number
}

const TMTapeRow: Component<TMTapeRowProps> = (props) => {
  return (
    <tr data-toggle="tooltip" title={`TM tape ${props.tapeIndex + 1}`}>
      <For each={props.getTape()}>
        {(symbol, index) => (
          <td class={`tape_cell ${index() === props.getHeadPosition() ? 'current' : ''}`}>
            {symbol}
          </td>
        )}
      </For>
    </tr>
  )
}