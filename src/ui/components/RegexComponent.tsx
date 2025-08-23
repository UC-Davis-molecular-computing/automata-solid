import type { Component } from 'solid-js'
import { createEffect, Show, For } from 'solid-js'
import { Regex } from '../../core/Regex'
import { appState, setAppState, hasComputationResult } from '../store/AppStore'
import './TableComponent.css'

interface RegexComponentProps {
  regex: Regex
}

export const RegexComponent: Component<RegexComponentProps> = (props) => {
  // Derived values from AppState (single source of truth)
  const hasResult = hasComputationResult

  // Computation is now triggered via message dispatch from App.tsx

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

  // Results are now dispatched to global store instead of using callbacks


  return (
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
  )
}