import type { Component } from 'solid-js'
import { createEffect, For, Show, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'
import { TM, TMConfiguration, ConfigDiff } from '../../core/TM'
import { TMParser } from '../../parsers/TMParser'
import { wildcardMatch, WILDCARD } from '../../core/Utils'
import { appState } from '../store/AppStore'
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
  onNavigationReady?: (controls: NavigationControls) => void
  onRunReady?: (runFunction: () => void) => void
  onResultChange?: (result: { hasResult: boolean; accepted: boolean; outputString?: string; hitMaxSteps?: boolean } | null) => void
}

interface TMComponentState {
  tm: TM | null
  error: string | null
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
    tm: null,
    error: null,
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
      // Parse the TM from YAML
      const parser = new TMParser()
      const tm = parser.parseTM(appState.editorContent)
      
      // Process the test input using memory-efficient ConfigDiff approach
      const { diffs, finalConfig } = tm.getConfigDiffsAndFinalConfig(appState.inputString)
      const initialConfig = tm.initialConfig(appState.inputString)
      const accepted = finalConfig.state === tm.acceptState
      const outputString = finalConfig.outputString()
      
      // Check if we hit the MAX_STEPS limit
      // This happens when we have MAX_STEPS diffs and the final configuration is not halting
      const hitMaxSteps = diffs.length === TM.MAX_STEPS && !finalConfig.isHalting()
      
      setState({
        tm,
        error: null,
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
      
    } catch (error) {
      setState({
        tm: null,
        error: error instanceof Error ? error.message : 'Unknown error parsing TM',
        hasResult: false
      })
    }
  }

  // Parse TM and conditionally process input based on runImmediately setting
  createEffect(() => {
    // Always try to parse the TM for validation
    try {
      const parser = new TMParser()
      const tm = parser.parseTM(appState.editorContent)
      
      if (appState.runImmediately) {
        // Run computation immediately
        runComputation()
      } else {
        // Just parse and show structure, but don't compute results
        setState({
          tm,
          error: null,
          hasResult: false
        })
      }
      
    } catch (error) {
      setState({
        tm: null,
        error: error instanceof Error ? error.message : 'Unknown error parsing TM',
        hasResult: false
      })
    }
  })

  // Reset computation results when test input changes in manual mode
  createEffect(() => {
    const currentInput = appState.inputString
    if (!appState.runImmediately && state.tm && state.hasResult && 
        currentInput !== state.lastComputedInput) {
      setState({
        hasResult: false,
        currentStep: 0
      })
    }
  })


  // Report result changes to parent
  createEffect(() => {
    if (props.onResultChange) {
      if (state.error || !state.tm) {
        props.onResultChange(null)
      } else {
        props.onResultChange({
          hasResult: state.hasResult,
          accepted: state.accepted,
          outputString: state.outputString,
          hitMaxSteps: state.hitMaxSteps
        })
      }
    }
  })

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
    if (!state.tm || state.error || !state.hasResult) return
    const newStep = Math.min(state.currentStep + 1, state.diffs.length)
    moveConfigToStep(newStep)
  }

  const goBackward = () => {
    if (!state.tm || state.error || !state.hasResult) return
    const newStep = Math.max(state.currentStep - 1, 0)
    moveConfigToStep(newStep)
  }

  const goToBeginning = () => {
    if (!state.tm || state.error || !state.hasResult || !state.initialConfig) return
    setState({
      currentStep: 0,
      currentConfig: state.initialConfig.copy()
    })
  }

  const goToEnd = () => {
    if (!state.tm || state.error || !state.hasResult || !state.finalConfig) return
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
        canGoForward: () => !!(state.tm && !state.error && state.hasResult && state.currentStep < state.diffs.length),
        canGoBackward: () => !!(state.tm && !state.error && state.hasResult && state.currentStep > 0)
      })
    }
    
    if (props.onRunReady) {
      props.onRunReady(runComputation)
    }
  })

  // Helper functions for rendering
  const getCurrentConfig = () => {
    if (!state.hasResult || !state.currentConfig) return null
    return state.currentConfig
  }

  const getCurrentState = () => {
    const config = getCurrentConfig()
    return config ? config.state : ''
  }

  return (
    <div class="dfa-table-component">
      <Show when={state.error}>
        <div class="error-message">
          <strong>Error:</strong>
          <pre class="error-text">{state.error}</pre>
        </div>
      </Show>

      <Show when={state.tm && !state.error}>
        <div class="dfa-content">
          {/* Tape Display */}
          <Show when={state.hasResult}>
            <div class="tm-tapes-container">
              <h3>Tapes <span class="tm-step-counter">Step {state.currentStep + 1}/{state.diffs.length + 1}</span></h3>
              <table class="tm-tapes-table">
                <tbody>
                  <For each={Array.from({ length: state.tm!.numTapes }, (_, i) => i)}>
                    {(tapeIndex) => (
                      <TMTapeRow 
                        config={getCurrentConfig()!}
                        tapeIndex={tapeIndex}
                      />
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>

          {/* Transition Table */}
          <div class="transition-table-container">
            <table class="transition-table">
              <thead>
                <tr>
                  <th class="transition_header_entry">State</th>
                  <th class="transition_header_entry">Transitions</th>
                </tr>
              </thead>
              <tbody>
                <For each={state.tm?.states || []}>
                  {(stateName) => (
                    <TMTransitionRow 
                      tm={state.tm!}
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

  const getStateClass = () => {
    if (isAcceptState()) return 'accept'
    if (isRejectState()) return 'reject'
    return '' // No special styling for regular states
  }

  const getTransitions = () => {
    const transitions = props.tm.delta[props.stateName]
    if (!transitions) return []
    
    return Object.entries(transitions).map(([symbols, action]) => ({
      symbols,
      action,
      display: `${symbols} → ${action.join(' , ')}`
    }))
  }

  const isCurrentTransition = (symbols: string) => {
    if (!isCurrentState() || !props.currentConfig) return false
    
    const scannedSymbols = props.currentConfig.currentScannedSymbols()
    const stateTransitions = props.tm.delta[props.stateName]
    
    if (!stateTransitions) return false
    
    // Check if exact match exists (has priority over wildcards)
    const hasExactMatch = stateTransitions.hasOwnProperty(scannedSymbols)
    
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
        <div class={`transition_entry_${getStateClass()} ${isCurrentState() ? 'current' : ''}`}>
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
                    <td class={`transition-entry ${isCurrentTransition(transition.symbols) ? 'current' : ''}`}>
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
  config: TMConfiguration
  tapeIndex: number
}

const TMTapeRow: Component<TMTapeRowProps> = (props) => {
  const getTape = () => props.config.tapes[props.tapeIndex] || []
  const getHeadPosition = () => props.config.headsPos[props.tapeIndex] || 0

  return (
    <tr data-toggle="tooltip" title={`TM tape ${props.tapeIndex + 1}`}>
      <For each={getTape()}>
        {(symbol, index) => (
          <td class={`tape_cell ${index() === getHeadPosition() ? 'current' : ''}`}>
            {symbol}
          </td>
        )}
      </For>
    </tr>
  )
}