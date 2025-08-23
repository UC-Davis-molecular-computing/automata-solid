import type { Component } from 'solid-js'
import { createEffect, createSignal, Show } from 'solid-js'
import * as Viz from '@viz-js/viz'
import { CFG } from '../../core/CFG'
import { appState, setAppState, hasExecutionData } from '../store/AppStore'
import { ViewMode } from '../types/AppState'
import { renderGraphEffect } from '../utils/GraphRenderer'
import { PanZoomSVG } from './PanZoomSVG'
import './CFGComponent.css'

interface CFGComponentProps {
  cfg: CFG
}

export const CFGComponent: Component<CFGComponentProps> = (_props) => {
  // Viz.js instance for rendering graphviz
  const [vizInstance, setVizInstance] = createSignal<Awaited<ReturnType<typeof Viz.instance>>>()
  const [graphSvg, setGraphSvg] = createSignal<SVGElement>((<svg />) as SVGElement)

  // Initialize Viz.js
  createEffect(async () => {
    try {
      const viz = await Viz.instance()
      setVizInstance(viz)
    } catch (error) {
      console.error('Failed to initialize Viz.js:', error)
    }
  })

  const parseTree = () => {
    if (appState.computation?.navigation?.executionData?.type === 'cfg') {
      const tree = appState.computation.navigation.executionData?.parseTree
      return tree
    }
    // This should not happen if caller checks hasNavigationData() first  
    throw new Error('parseTree() called when CFG execution data not available')
  }

  const parseTreeString = () => {
    return parseTree()?.toTreeString?.()
  }

  // Generate DOT graph description for the parse tree
  const generateDotGraph = () => {
    const tree = parseTree()
    if (!tree) return 'digraph { }'
    return tree.toGraphviz(appState.cfgLeavesAtBottom)
  }

  // Effect to update graph when state changes
  createEffect(() =>
    renderGraphEffect({
      isGraphView: () => appState.viewMode === ViewMode.Graph,
      vizInstance,
      generateDotGraph,
      setGraphSvg
    })
  )

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
    <div class="automaton-component">
      <Show when={hasExecutionData() && appState.computation?.accepts}>
        <div class="automaton-content">
          {/* Text View */}
          <Show when={appState.viewMode !== ViewMode.Graph}>
            <div class="cfg-parse-tree">
              <h3>Parse Tree</h3>
              <div class="parse-tree-display">
                <pre>{parseTreeString()}</pre>
              </div>
            </div>
          </Show>

          {/* Graph View */}
          <Show when={appState.viewMode === ViewMode.Graph}>
            <div class="graph-view-content">
              <PanZoomSVG svgElement={graphSvg()} />
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}