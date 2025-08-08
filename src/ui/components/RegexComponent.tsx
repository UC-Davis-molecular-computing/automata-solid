import type { Component } from 'solid-js'
import { createEffect, Show, onMount, For } from 'solid-js'
import { createStore } from 'solid-js/store'
import { Regex } from '../../core/Regex'
import { RegexParser } from '../../parsers/RegexParser'
import { appState, dispatch } from '../store/AppStore'
import { SetComputationResult, SetParseError } from '../types/Messages'
import './TableComponent.css'

interface RegexComponentProps {
  onRunReady?: (runFunction: () => void) => void
}

interface RegexComponentState {
  regex: Regex | null
  error: string | null
  accepted: boolean
  hasResult: boolean // Whether computation has been run and result should be shown
  lastComputedInput: string // Track the input string that was last computed
}

export const RegexComponent: Component<RegexComponentProps> = (props) => {
  // Local component state
  const [state, setState] = createStore<RegexComponentState>({
    regex: null,
    error: null,
    accepted: false,
    hasResult: false,
    lastComputedInput: ''
  })

  // Function to run the computation
  const runComputation = () => {
    try {
      // Parse the regex from the editor content (handles comment stripping)
      const parser = new RegexParser()
      const regex = parser.parseRegex(appState.editorContent)
      
      // Test the input string
      const accepted = regex.accepts(appState.inputString)
      
      setState({
        regex,
        error: null,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error parsing regex'
      setState({
        regex: null,
        error: errorMessage,
        hasResult: false
      })
      
      // Dispatch parse error to global store
      dispatch(new SetParseError(errorMessage))
    }
  }

  // Parse regex and conditionally process input based on runImmediately setting
  createEffect(() => {
    // Always try to parse the regex for validation
    try {
      const parser = new RegexParser()
      const regex = parser.parseRegex(appState.editorContent)
      
      if (appState.runImmediately) {
        // Run computation immediately
        runComputation()
      } else {
        // Just parse and show structure, but don't compute results
        // Reset hasResult when content changes
        setState({
          regex,
          error: null,
          hasResult: false
        })
        
        // Clear parse errors when content changes in manual mode
        dispatch(new SetParseError(null))
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error parsing regex'
      setState({
        regex: null,
        error: errorMessage,
        hasResult: false
      })
      
      // Dispatch parse error to global store
      dispatch(new SetParseError(errorMessage))
    }
  })

  // Reset computation results when test input changes in manual mode
  createEffect(() => {
    // Only reset if the input string actually changed since last computation
    const currentInput = appState.inputString
    if (!appState.runImmediately && state.regex && state.hasResult && 
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
      <Show when={state.error}>
        <div class="error-message">
          <strong>Error:</strong>
          <pre class="error-text">{state.error}</pre>
        </div>
      </Show>

      <Show when={state.regex && !state.error}>
        <div class="dfa-content">
          {/* Regex Information */}
          <div class="regex-info">
            <Show when={state.regex?.getSubstitutionSteps().length === 0}>
              <div class="regex-section">
                <h3>Regular Expression</h3>
                <div class="regex-display">
                  <code>{state.regex?.toString()}</code>
                </div>
              </div>
            </Show>
            
            <Show when={state.regex?.getSubstitutionSteps().length && state.regex.getSubstitutionSteps().length > 0}>
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
                      <For each={state.regex?.getSubstitutionSteps() || []}>
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
            
            <Show when={state.regex?.getInputAlphabet().length && state.regex.getInputAlphabet().length > 0}>
              <div class="regex-section">
                <h3>
                  Detected Input Alphabet: <code class="inline-alphabet">{'{' + state.regex?.getInputAlphabet().join(', ') + '}'}</code>
                </h3>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}