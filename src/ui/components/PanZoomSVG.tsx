import type { Component, JSX } from 'solid-js'
import { onMount, onCleanup, createEffect } from 'solid-js'
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

// Simple global state to persist pan/zoom across component remounts
let globalHasInitialFit = false
let savedPanZoom = { x: 0, y: 0, scale: 1 }

export const PanZoomSVG: Component<PanZoomSVGProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  let svgContainerRef: HTMLDivElement | undefined
  let panzoomInstance: ReturnType<typeof Panzoom> | undefined
  let wheelHandler: ((event: WheelEvent) => void) | undefined
  let isEventListenerAdded = false

  // Save current pan/zoom state whenever it changes
  const savePanZoomState = () => {
    if (panzoomInstance) {
      const pan = panzoomInstance.getPan()
      const scale = panzoomInstance.getScale()
      savedPanZoom = { x: pan.x, y: pan.y, scale }
    }
  }

  // Enable event listening after state is properly set
  const enableEventListening = () => {
    if (svgContainerRef && panzoomInstance && !isEventListenerAdded) {
      svgContainerRef.addEventListener('panzoomchange', savePanZoomState)
      isEventListenerAdded = true
    }
  }

  // Initialize panzoom instance only
  const initializePanzoom = () => {
    if (!containerRef || !svgContainerRef || panzoomInstance) return
    
    try {
      panzoomInstance = Panzoom(svgContainerRef, {
        maxScale: props.maxScale ?? 4,
        minScale: props.minScale ?? 0.5,
        startScale: props.startScale ?? 1,
        animate: props.animate ?? false, // Disable animation during initialization
        duration: props.duration ?? 200,
        // Disable panning on text selection
        exclude: 'text',
        // Smooth animations
        transition: true
      })

      // Add simple wheel handler for zooming
      wheelHandler = (event: WheelEvent) => {
        if (panzoomInstance) {
          event.preventDefault()
          panzoomInstance.zoomWithWheel(event)
        }
      }
      
      containerRef.addEventListener('wheel', wheelHandler, { passive: false })

    } catch (error) {
      console.error('Failed to initialize Panzoom:', error)
    }
  }

  // Update SVG content and handle state restoration
  createEffect(() => {
    if (!svgContainerRef) return
    
    if (props.svgElement) {
      // Update SVG content first
      svgContainerRef.innerHTML = ''
      svgContainerRef.appendChild(props.svgElement.cloneNode(true))
      
      if (panzoomInstance) {
        // Restore saved state immediately after SVG is updated
        if (globalHasInitialFit) {
          panzoomInstance.zoom(savedPanZoom.scale, { animate: false })
          panzoomInstance.pan(savedPanZoom.x, savedPanZoom.y, { animate: false })
          enableEventListening()
        }
        // ONLY do initial fit if this is the very first SVG load ever
        else {
          panzoomInstance.reset()
          globalHasInitialFit = true
          enableEventListening()
        }
      }
    } else {
      // Show loading message when no SVG
      svgContainerRef.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Loading graph...</div>'
    }
  })

  onMount(() => {
    if (!containerRef || !svgContainerRef) return
    initializePanzoom()
  })

  onCleanup(() => {
    // Save state before cleanup
    savePanZoomState()
    
    if (panzoomInstance) {
      panzoomInstance.destroy()
      panzoomInstance = undefined
    }
    
    if (wheelHandler && containerRef) {
      containerRef.removeEventListener('wheel', wheelHandler)
      wheelHandler = undefined
    }
  })

  // Public API methods
  const zoomIn = () => {
    if (panzoomInstance) panzoomInstance.zoomIn()
  }

  const zoomOut = () => {
    if (panzoomInstance) panzoomInstance.zoomOut()
  }

  const zoomToFit = () => {
    if (!panzoomInstance) return
    
    panzoomInstance.reset()
    // Save the new state after reset
    savePanZoomState()
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

      {/* SVG Container - this is what gets panned/zoomed */}
      <div
        ref={(el) => { svgContainerRef = el }}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center'
        }}
      >
        {/* For children-based usage (when svgElement prop is not used) */}
        {!props.svgElement && props.children}
      </div>
    </div>
  )
}