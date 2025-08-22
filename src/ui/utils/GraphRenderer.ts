import * as Viz from '@viz-js/viz'

interface GraphRendererOptions {
  isGraphView: () => boolean | undefined
  vizInstance: () => Awaited<ReturnType<typeof Viz.instance>> | undefined
  generateDotGraph: () => string
  setGraphSvg: (value: SVGElement | undefined) => void
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

      // Ensure SVG has proper dimensions and units
      const viewBox = svg.getAttribute('viewBox')
      if (viewBox) {
        const [, , width, height] = viewBox.split(' ').map(Number)
        // Set dimensions in pixels instead of points
        svg.setAttribute('width', `${width}px`)
        svg.setAttribute('height', `${height}px`)
      }
      
      // Ensure SVG is visible and sized properly
      svg.style.display = 'block'
      svg.style.maxWidth = '100%'
      svg.style.maxHeight = '100%'
      svg.style.width = 'auto'
      svg.style.height = 'auto'

      setGraphSvg(svg)
    } catch (error) {
      console.error('Failed to render graph:', error)
    }
  } else if (!graphView) {
    // Clear the SVG when not in graph view to ensure clean state
    setGraphSvg(undefined)
  }
}