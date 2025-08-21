import type { Component } from 'solid-js'
import { createEffect, Show } from 'solid-js'
import { CFG } from '../../core/CFG'
import { appState, setAppState, hasExecutionData } from '../store/AppStore'
import './TableComponent.css'

interface CFGComponentProps {
  cfg: CFG
}

export const CFGComponent: Component<CFGComponentProps> = (_props) => {
  const parseTree = () => {
    if (appState.computation?.navigation?.executionData?.type === 'cfg') {
      const tree = appState.computation.navigation.executionData?.parseTree
      return tree?.toTreeString?.()
    }
    // This should not happen if caller checks hasNavigationData() first  
    throw new Error('parseTree() called when CFG execution data not available')
  }

  // Clear results when inputString changes in manual mode  
  createEffect((prevInput) => {
    const currentInput = appState.inputString

    // Only clear results if input actually changed and we're in manual mode
    // We don't really "navigate" with a CFG, but we store the parse tree
    // in appState.computation.navigation.executionData
    if (!appState.runImmediately && hasExecutionData() &&
      prevInput !== undefined && prevInput !== currentInput) {
      setAppState('computation', undefined)
    }

    return currentInput
  })

  return (
    <div class="dfa-table-component">
      <div class="dfa-content">
        {/* Parse Tree Display */}
        <Show when={hasExecutionData() && appState.computation?.accepts && parseTree()}>
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