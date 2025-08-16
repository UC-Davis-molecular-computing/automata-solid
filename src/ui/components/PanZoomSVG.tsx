import type { Component, JSX } from 'solid-js'
import { onMount, onCleanup, createSignal } from 'solid-js'
import Panzoom from '@panzoom/panzoom'

interface PanZoomSVGProps {
  children?: JSX.Element
  svgElement?: SVGElement | null
  class?: string
  style?: JSX.CSSProperties | string
  maxScale?: number
  minScale?: number
  startScale?: number
  animate?: boolean
  duration?: number
}

export const PanZoomSVG: Component<PanZoomSVGProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  const [panzoomInstance, setPanzoomInstance] = createSignal<ReturnType<typeof Panzoom> | null>(null)

  onMount(() => {
    if (!containerRef) return

    // Wait for SVG element to be available
    const initializePanzoom = () => {
      if (!containerRef) return
      
      const svgElement = props.svgElement || containerRef.querySelector('svg')
      
      if (svgElement) {
        try {
          const panzoom = Panzoom(svgElement, {
            maxScale: props.maxScale ?? 4,
            minScale: props.minScale ?? 0.5,
            startScale: props.startScale ?? 1,
            animate: props.animate ?? true,
            duration: props.duration ?? 200,
            // Enable mouse wheel zooming
            wheel: true,
            // Disable panning on text selection
            exclude: 'text',
            // Smooth animations
            transition: true
          })

          setPanzoomInstance(panzoom)

          // Add mouse wheel event listener to container
          containerRef.addEventListener('wheel', (event) => {
            if (!event.ctrlKey && !event.metaKey) {
              panzoom.zoomWithWheel(event)
            }
          })

        } catch (error) {
          console.error('Failed to initialize Panzoom:', error)
        }
      }
    }

    // Try to initialize immediately
    initializePanzoom()

    // If SVG isn't ready yet, watch for it
    if (!props.svgElement && !containerRef.querySelector('svg')) {
      const observer = new MutationObserver(() => {
        if (containerRef && containerRef.querySelector('svg')) {
          initializePanzoom()
          observer.disconnect()
        }
      })
      
      observer.observe(containerRef, {
        childList: true,
        subtree: true
      })

      // Clean up observer after a reasonable timeout
      setTimeout(() => observer.disconnect(), 5000)
    }
  })

  onCleanup(() => {
    const instance = panzoomInstance()
    if (instance) {
      instance.destroy()
    }
  })

  // Public API methods that could be useful
  const zoomIn = () => {
    const instance = panzoomInstance()
    if (instance) instance.zoomIn()
  }

  const zoomOut = () => {
    const instance = panzoomInstance()
    if (instance) instance.zoomOut()
  }

  const zoomToFit = () => {
    const instance = panzoomInstance()
    if (!instance || !containerRef) return
    
    const svgElement = containerRef.querySelector('svg') as SVGSVGElement
    if (!svgElement) return
    
    // Reset first to get accurate measurements
    instance.reset()
    
    // Calculate the same fit scale as initialization
    const containerRect = containerRef.getBoundingClientRect()
    
    let svgWidth: number, svgHeight: number
    
    if (svgElement.viewBox && svgElement.viewBox.baseVal.width) {
      svgWidth = svgElement.viewBox.baseVal.width
      svgHeight = svgElement.viewBox.baseVal.height
    } else {
      const bbox = svgElement.getBBox ? svgElement.getBBox() : svgElement.getBoundingClientRect()
      svgWidth = bbox.width
      svgHeight = bbox.height
    }
    
    // Calculate scale to fit both dimensions with padding
    const padding = 20
    const scaleX = (containerRect.width - padding * 2) / svgWidth
    const scaleY = (containerRect.height - padding * 2) / svgHeight
    const fitScale = Math.min(scaleX, scaleY, 1)
    
    // Apply the calculated scale
    instance.zoom(fitScale)
    
    // Center the SVG
    const scaledWidth = svgWidth * fitScale
    const scaledHeight = svgHeight * fitScale
    const panX = (containerRect.width - scaledWidth) / 2
    const panY = (containerRect.height - scaledHeight) / 2
    
    instance.pan(panX, panY)
  }

  return (
    <div
      ref={(el) => { containerRef = el }}
      class={props.class}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        border: '1px solid #ccc',
        position: 'relative',
        cursor: 'grab',
        ...(typeof props.style === 'object' ? props.style : {})
      }}
      data-panzoom-container
    >
      {/* Control buttons (optional) */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        'z-index': 10,
        display: 'flex',
        gap: '5px'
      }}>
        <button
          onClick={zoomIn}
          style={{
            padding: '5px 10px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #ccc',
            cursor: 'pointer',
            'border-radius': '3px'
          }}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          style={{
            padding: '5px 10px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #ccc',
            cursor: 'pointer',
            'border-radius': '3px'
          }}
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={zoomToFit}
          style={{
            padding: '5px 10px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #ccc',
            cursor: 'pointer',
            'border-radius': '3px',
            'font-size': '12px'
          }}
          title="Fit to View"
        >
          ⌂
        </button>
      </div>

      {props.children}
    </div>
  )
}