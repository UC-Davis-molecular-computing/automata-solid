import type { Component } from 'solid-js'
import { createEffect, Show, onMount, For } from 'solid-js'
import { createStore } from 'solid-js/store'
import { Regex } from '../../core/Regex'
import { appState, dispatch } from '../store/AppStore'
import { SetComputationResult, SetParseError } from '../types/Messages'
import './TableComponent.css'

interface RegexComponentProps {
  regex: Regex
  onRunReady?: (runFunction: () => void) => void
}

interface RegexComponentState {
  accepted: boolean
  hasResult: boolean // Whether computation has been run and result should be shown
  lastComputedInput: string // Track the input string that was last computed
}

export const RegexComponent: Component<RegexComponentProps> = (props) => {
  // Local component state
  const [state, setState] = createStore<RegexComponentState>({
    accepted: false,
    hasResult: false,
    lastComputedInput: ''
  })

  // Function to run the computation
  const runComputation = () => {
    try {
      // Test the input string
      const accepted = props.regex.accepts(appState.inputString)
      
      setState({
        accepted,
        hasResult: true,
        lastComputedInput: appState.inputString
      })
      
      // Dispatch computation result to global store
      dispatch(new SetComputationResult({
        accepts: accepted,
        outputString: undefined // Regex doesn't have output strings
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
          {/* Regex Information */}
          <div class="regex-info">
            <Show when={props.regex.getSubstitutionSteps().length === 0}>
              <div class="regex-section">
                <h3>Regular Expression</h3>
                <div class="regex-display">
                  <code>{props.regex.toString()}</code>
                </div>
              </div>
            </Show>
            
            <Show when={props.regex.getSubstitutionSteps().length > 0}>
              <div class="regex-section">
                <div class="substitution-table-container">
                  <table class="substitution-table">
                    <thead>
                      <tr>
                        <th class="expression-header">Expansion of Regular Expression</th>
                        <th class="subexpressions-header">Subexpressions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={props.regex.getSubstitutionSteps()}>
                        {(step) => (
                          <tr class="substitution-row">
                            <td class="expression-cell">
                              <code>{step.expression}</code>
                            </td>
                            <td class="subexpressions-cell">
                              <code>{step.subexpressions}</code>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>
            </Show>
            
            <Show when={props.regex.getInputAlphabet().length > 0}>
              <div class="regex-section">
                <h3>
                  Detected Input Alphabet: <code class="inline-alphabet">{'{' + props.regex.getInputAlphabet().join(', ') + '}'}</code>
                </h3>
              </div>
            </Show>
          </div>
      </div>
    </div>
  )
}