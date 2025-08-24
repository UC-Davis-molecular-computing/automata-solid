import type { Component } from 'solid-js'
import { createEffect, createSignal, Show } from 'solid-js'
import * as Viz from '@viz-js/viz'
import { CFG, EPSILON, TreeNode } from '../../core/CFG'
import { GRAPHVIZ_NODE_FONT_SIZE, GRAPHVIZ_NODE_MARGIN } from '../../core/Utils'
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

  // Helper functions for DOT graph generation
  const generateDotNodes = (
    tree: TreeNode, 
    nodeCounter: { count: number }, 
    nodeMap: Map<TreeNode, string>, 
    leafNodeIds: string[]
  ): string => {
    const nodeId = `node${nodeCounter.count++}`
    nodeMap.set(tree, nodeId)
    
    // Style leaf nodes based on type
    const isLeaf = tree.children.length === 0
    let nodeAttrs = `label="${tree.symbol}"`
    
    if (isLeaf) {
      if (leafNodeIds.length >= 0) {  // Only collect if array is provided
        leafNodeIds.push(nodeId)
      }
      if (tree.symbol === EPSILON) {
        nodeAttrs += `, class="epsilon-leaf"`
      } else {
        nodeAttrs += `, class="terminal-leaf"`
      }
    } else {
      nodeAttrs += `, class="variable-node"`
    }
    
    let dot = `  ${nodeId} [${nodeAttrs}];\n`
    
    for (const child of tree.children) {
      dot += generateDotNodes(child, nodeCounter, nodeMap, leafNodeIds)
    }
    
    return dot
  }

  const generateDotEdges = (tree: TreeNode, nodeMap: Map<TreeNode, string>): string => {
    let dot = ''
    const thisNodeId = nodeMap.get(tree)
    
    for (const child of tree.children) {
      const childNodeId = nodeMap.get(child)
      dot += `  ${thisNodeId} -> ${childNodeId};\n`
      dot += generateDotEdges(child, nodeMap)
    }
    
    return dot
  }

  // Generate DOT graph description for the parse tree
  const generateDotGraph = () => {
    const tree = parseTree()
    if (!tree) return 'digraph { }'
    
    let dot = 'digraph {\n'
    dot += '  rankdir=TB;\n'  // Top-down layout
    dot += `  node [shape=circle, fontsize=${GRAPHVIZ_NODE_FONT_SIZE}, margin=${GRAPHVIZ_NODE_MARGIN}];\n`  // Larger font with reduced padding
    
    const nodeCounter = { count: 0 }
    const nodeMap = new Map<TreeNode, string>()
    const leafNodeIds: string[] = []
    
    // Generate nodes and edges
    dot += generateDotNodes(tree, nodeCounter, nodeMap, appState.cfgLeavesAtBottom ? leafNodeIds : [])
    dot += generateDotEdges(tree, nodeMap)
    
    // Force all leaf nodes to the same bottom rank if requested
    if (appState.cfgLeavesAtBottom && leafNodeIds.length > 0) {
      dot += `  {rank=same; ${leafNodeIds.join('; ')}};\n`
    }
    
    dot += '}\n'
    return dot
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