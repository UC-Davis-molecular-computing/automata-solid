import type { Component } from 'solid-js'
import { createEffect, Show } from 'solid-js'
import { CFG } from '../../core/CFG'
import { appState, setAppState } from '../store/AppStore'
import './TableComponent.css'

interface CFGComponentProps {
  cfg: CFG
}

export const CFGComponent: Component<CFGComponentProps> = (_props) => {
  // Derived values from AppState (single source of truth)
  const hasResult = () => appState.computation?.navigation?.executionData !== undefined

  // Get parseTree from appState computation - only call when hasResult() is true
  const parseTree = () => {
    if (appState.computation?.navigation?.executionData?.type === 'cfg') {
      const tree = appState.computation.navigation.executionData?.parseTree
      return tree?.toTreeString?.()
    }
    // This should not happen if caller checks hasResult() first  
    throw new Error('parseTree() called when CFG execution data not available')
  }

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