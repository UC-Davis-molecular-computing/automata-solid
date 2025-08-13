import type { Component } from 'solid-js'
import { createEffect, createSignal, Show } from 'solid-js'
import { CFG } from '../../core/CFG'
import { appState, setAppState } from '../store/AppStore'
import { assert } from '../../core/Utils'
import './TableComponent.css'

interface CFGComponentProps {
  cfg: CFG
}

export const CFGComponent: Component<CFGComponentProps> = (props) => {
  // Local component state (only CFG-specific state)
  const [parseTree, setParseTree] = createSignal<string | undefined>(undefined)

  // Derived values from AppState (single source of truth)
  const hasResult = () => appState.computation !== undefined

  // Computation is now triggered via message dispatch from App.tsx

  // Update parseTree when result changes (for both manual and immediate modes)
  createEffect(() => {
    if (hasResult()) {
      try {
        assert(appState.computation, 'computation should exist when hasResult() is true')
        const accepted = appState.computation.accepts
        const tree = accepted ? props.cfg.parseTree(appState.inputString)?.toTreeString() || undefined : undefined
        setParseTree(tree)
      } catch {
        // If we can't compute parse tree, reset
        setParseTree(undefined)
      }
    }
  })

  // Clear results and reset parseTree when inputString changes in manual mode  
  createEffect((prevInput) => {
    const currentInput = appState.inputString
    
    // Only clear results if input actually changed and we're in manual mode
    if (!appState.runImmediately && hasResult() && 
        prevInput !== undefined && prevInput !== currentInput) {
      setParseTree(undefined)
      setAppState('computation', undefined)
    }
    
    return currentInput
  })

  // Results are now dispatched to global store instead of using callbacks

  return (
    <div class="dfa-table-component">
      <div class="dfa-content">
          {/* Parse Tree Display */}
          <Show when={hasResult() && appState.computation?.accepts && parseTree()}>
            <div class="cfg-parse-tree">
              <h3>Parse Tree</h3>
              <div class="parse-tree-display">
                <pre><code>{parseTree()}</code></pre>
              </div>
            </div>
          </Show>
      </div>
    </div>
  )
}