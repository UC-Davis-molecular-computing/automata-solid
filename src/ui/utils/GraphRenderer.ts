import * as Viz from '@viz-js/viz'

interface GraphRendererOptions {
  isGraphView: () => boolean
  vizInstance: () => Awaited<ReturnType<typeof Viz.instance>> | undefined
  generateDotGraph: () => string
  setGraphSvg: (value: SVGElement) => void
}

export function renderGraphEffect(options: GraphRendererOptions): void {
  const { isGraphView, vizInstance, generateDotGraph, setGraphSvg } = options

  // Explicitly access both reactive values to ensure they're tracked as dependencies
  const viz = vizInstance()
  const graphView = isGraphView()
  
  if (graphView && viz) {
    try {
      const dot = generateDotGraph()
      const svg = viz.renderSVGElement(dot)
      setGraphSvg(svg)
    } catch (error) {
      console.error('Failed to render graph:', error)
    }
  }
}