import type { Component } from 'solid-js'
import { createEffect, Show, onMount, For } from 'solid-js'
import { Regex } from '../../core/Regex'
import { appState, dispatch, setAppState } from '../store/AppStore'
import { SetComputationResult, SetParseError } from '../types/Messages'
import './TableComponent.css'

interface RegexComponentProps {
  regex: Regex
  onRunReady?: (runFunction: () => void) => void
}

export const RegexComponent: Component<RegexComponentProps> = (props) => {
  // Derived values from AppState (single source of truth)
  const hasResult = () => appState.computation !== undefined

  // Function to run the computation (for manual mode only)
  const runComputation = () => {
    try {
      // Test the input string
      const accepted = props.regex.accepts(appState.inputString)
      
      // Computation result is handled by centralized logic in AppStore
      dispatch(new SetComputationResult({
        accepts: accepted,
        outputString: undefined // Regex doesn't have output strings
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during computation'
      dispatch(new SetParseError(errorMessage))
    }
  }

  // Clear results when inputString changes in manual mode  
  createEffect((prevInput) => {
    const currentInput = appState.inputString
    
    // Only clear results if input actually changed and we're in manual mode
    if (!appState.runImmediately && hasResult() && 
        prevInput !== undefined && prevInput !== currentInput) {
      setAppState('computation', undefined)
    }
    
    return currentInput
  })

  // Export run function once on mount (Regex is guaranteed to be valid)
  onMount(() => {
    if (props.onRunReady) {
      props.onRunReady(runComputation)
    }
  })

  // Results are now dispatched to global store instead of using callbacks


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