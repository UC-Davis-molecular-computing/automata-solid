import type { Component } from 'solid-js'
import { createEffect, For, Show, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'
import { TM, TMConfiguration, ConfigDiff } from '../../core/TM'
import { wildcardMatch, WILDCARD, assert } from '../../core/Utils'
import { appState, dispatch } from '../store/AppStore'
import { SetComputationResult, SetParseError } from '../types/Messages'
import './TableComponent.css' // Reuse existing CSS

interface NavigationControls {
  goForward: () => void
  goBackward: () => void
  goToBeginning: () => void
  goToEnd: () => void
  canGoForward: () => boolean
  canGoBackward: () => boolean
}

interface TMComponentProps {
  tm: TM
  onNavigationReady?: (controls: NavigationControls) => void
  onRunReady?: (runFunction: () => void) => void
}

interface TMComponentState {
  currentStep: number
  diffs: ConfigDiff[]
  initialConfig: TMConfiguration | null
  finalConfig: TMConfiguration | null
  currentConfig: TMConfiguration | null
  accepted: boolean
  hasResult: boolean
  lastComputedInput: string
  outputString: string
  hitMaxSteps: boolean
}

export const TMComponent: Component<TMComponentProps> = (props) => {
  // Local component state
  const [state, setState] = createStore<TMComponentState>({
    currentStep: 0,
    diffs: [],
    initialConfig: null,
    finalConfig: null,
    currentConfig: null,
    accepted: false,
    hasResult: false,
    lastComputedInput: '',
    outputString: '',
    hitMaxSteps: false
  })

  // Function to run the computation
  const runComputation = () => {
    try {
      // Process the test input using memory-efficient ConfigDiff approach
      const { diffs, finalConfig } = props.tm.getConfigDiffsAndFinalConfig(appState.inputString)
      const initialConfig = props.tm.initialConfig(appState.inputString)
      const accepted = finalConfig.state === props.tm.acceptState
      const outputString = finalConfig.outputString()
      
      // Check if we hit the MAX_STEPS limit
      // This happens when we have MAX_STEPS diffs and the final configuration is not halting
      const hitMaxSteps = diffs.length === TM.MAX_STEPS && !finalConfig.isHalting()
      
      setState({
        currentStep: 0,
        diffs,
        initialConfig,
        finalConfig,
        currentConfig: initialConfig.copy(),
        accepted,
        hasResult: true,
        lastComputedInput: appState.inputString,
        outputString,
        hitMaxSteps
      })
      
      // Dispatch computation result to global store
      dispatch(new SetComputationResult({
        accepts: accepted,
        outputString: outputString,
        error: hitMaxSteps ? 'MAX_STEPS_REACHED' : undefined
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during computation'
      dispatch(new SetParseError(errorMessage))
    }
  }

  // Handle computation and initial state based on settings
  createEffect(() => {
    // Depend on both editorContent and inputString for reactivity
    const inputString = appState.inputString
    const runImmediately = appState.runImmediately
    
    if (runImmediately) {
      // Run computation immediately
      runComputation()
    } else {
      // Just show initial configuration without running computation
      // This will update whenever either editorContent OR inputString changes
      const initialConfig = props.tm.initialConfig(inputString)
      setState({
        hasResult: false,
        initialConfig,
        currentConfig: initialConfig.copy(),
        currentStep: 0,
        lastComputedInput: ''
      })
    }
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
    if (!state.hasResult) return
    const newStep = Math.min(state.currentStep + 1, state.diffs.length)
    moveConfigToStep(newStep)
  }

  const goBackward = () => {
    if (!state.hasResult) return
    const newStep = Math.max(state.currentStep - 1, 0)
    moveConfigToStep(newStep)
  }

  const goToBeginning = () => {
    if (!state.hasResult || !state.initialConfig) return
    setState({
      currentStep: 0,
      currentConfig: state.initialConfig.copy()
    })
  }

  const goToEnd = () => {
    if (!state.hasResult || !state.finalConfig) return
    setState({
      currentStep: state.diffs.length,
      currentConfig: state.finalConfig.copy()
    })
  }

  // Export navigation functions and run function once on mount
  onMount(() => {
    if (props.onNavigationReady) {
      props.onNavigationReady({
        goForward,
        goBackward,
        goToBeginning,
        goToEnd,
        canGoForward: () => state.hasResult && state.currentStep < state.diffs.length,
        canGoBackward: () => state.hasResult && state.currentStep > 0
      })
    }
    
    if (props.onRunReady) {
      props.onRunReady(runComputation)
    }
  })

  // Helper functions for rendering
  const getCurrentConfig = () => {
    // Return current config regardless of hasResult status
    return state.currentConfig
  }

  const getCurrentState = () => {
    const config = getCurrentConfig()
    return config ? config.state : ''
  }

  return (
    <div class="automaton-table-component">
      <div class="automaton-content">
        {/* Tape Display - TM specific */}
        <Show when={state.currentConfig}>
          <div class="tm-tapes-container">
            <h3>Tapes <span class="tm-step-counter">{state.hasResult ? `Step ${state.currentStep + 1}/${state.diffs.length + 1}` : 'Initial State'}</span></h3>
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

        {/* Transition Table - Generic styling */}
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
    </div>
  )
}

// Component for displaying transition row
interface TMTransitionRowProps {
  tm: TM
  stateName: string
  currentState: string
  currentConfig: TMConfiguration | null
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