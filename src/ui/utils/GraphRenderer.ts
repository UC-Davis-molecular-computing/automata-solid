import * as Viz from '@viz-js/viz'

interface GraphRendererOptions {
  isGraphView?: boolean
  vizInstance: () => Awaited<ReturnType<typeof Viz.instance>> | undefined
  generateDotGraph: () => string
  setGraphSvg: (value: SVGElement | undefined) => void
}

export function renderGraphEffect(options: GraphRendererOptions): void {
  const { isGraphView, vizInstance, generateDotGraph, setGraphSvg } = options

  if (isGraphView && vizInstance()) {
    try {
      const dot = generateDotGraph()
      const viz = vizInstance()
      if (!viz) return
      const svg = viz.renderSVGElement(dot)

      // Let the SVG maintain its intrinsic size and aspect ratio
      // The PanZoomSVG container will handle the sizing constraints
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.style.maxWidth = '100%'
      svg.style.maxHeight = '100%'
      svg.style.height = 'auto'
      svg.style.width = 'auto'

      setGraphSvg(svg)
    } catch (error) {
      console.error('Failed to render graph:', error)
    }
  }
}