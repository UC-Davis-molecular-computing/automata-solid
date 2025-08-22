import type { Component, JSX } from 'solid-js'
import { onMount, onCleanup, createEffect } from 'solid-js'
import Panzoom from '@panzoom/panzoom'
import './PanZoomSVG.css'

interface PanZoomSVGProps {
  children?: JSX.Element
  svgElement?: SVGElement | null
  class?: string
  style?: JSX.CSSProperties | string
  startScale?: number
  animate?: boolean
  duration?: number
}


export const PanZoomSVG: Component<PanZoomSVGProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  let svgContainerRef: HTMLDivElement | undefined
  let panzoomInstance: ReturnType<typeof Panzoom> | undefined


  // Initialize panzoom instance only
  const initializePanzoom = () => {
    if (!containerRef || !svgContainerRef || panzoomInstance) return

    try {
      panzoomInstance = Panzoom(svgContainerRef, {
        maxScale: 10,
        minScale: 0.1,
        startScale: props.startScale ?? 1,
        animate: props.animate ?? false, // Disable animation during initialization
        duration: props.duration ?? 200,
        // Disable panning on text selection
        exclude: '.panzoom-controls, .panzoom-control-btn',
        // Smooth animations
        transition: true,
        // Use the container as the canvas for capturing events
        canvas: containerRef,
        // cursor: 'grab', // turns white and invisible in Chrome sometimes, so go with the default 'move'
      })

      // Add wheel handler to container for zooming
      containerRef.addEventListener('wheel', (event: WheelEvent) => {
        if (panzoomInstance) {
          event.preventDefault()
          panzoomInstance.zoomWithWheel(event)
        }
      }, { passive: false })

      // These are used to style the grab and grabbing cursors, but since they turn white and invisible
      // on a white background in Chrome sometimes, these are commented out to avoid the disappearing cursor.
      // // Use Panzoom's own events for cursor changes
      // svgContainerRef.addEventListener('panzoomstart', () => {
      //   if (containerRef) {
      //     containerRef.classList.add('grabbing')
      //   }
      // })

      // svgContainerRef.addEventListener('panzoomend', () => {
      //   if (containerRef) {
      //     containerRef.classList.remove('grabbing')
      //   }
      // })

    } catch (error) {
      console.error('Failed to initialize Panzoom:', error)
    }
  }

  // Update SVG content when it changes
  createEffect(() => {
    if (!svgContainerRef) return
    
    if (props.svgElement) {
      // Only update the SVG content, don't touch zoom/pan
      svgContainerRef.innerHTML = ''
      svgContainerRef.appendChild(props.svgElement.cloneNode(true))
    }
  })

  onMount(() => {
    if (!containerRef || !svgContainerRef) return
    initializePanzoom()
  })

  onCleanup(() => {
    if (panzoomInstance) {
      panzoomInstance.destroy()
      panzoomInstance = undefined
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
    
    // Just reset - let panzoom handle the fit
    panzoomInstance.reset()
  }

  let panzoomContainerClassname = 'panzoom-container'
  if (props.class) {
    panzoomContainerClassname += ' ' + props.class
  }

  return (
    <div
      ref={(el) => { containerRef = el }}
      class={panzoomContainerClassname}
      style={typeof props.style === 'object' ? props.style : undefined}
      data-panzoom-container
    >
      {/* Control buttons (optional) */}
      <div class="panzoom-controls">
        <button
          onClick={zoomIn}
          class="panzoom-control-btn"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          class="panzoom-control-btn"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={zoomToFit}
          class="panzoom-control-btn"
          title="Fit to View"
          style={{ 'font-size': '12px' }}
        >
          ⌂
        </button>
      </div>

      {/* SVG Container - this is what gets panned/zoomed */}
      <div
        ref={(el) => { svgContainerRef = el }}
        class="panzoom-element"
      >
        {/* For children-based usage (when svgElement prop is not used) */}
        {!props.svgElement && props.children}
      </div>
    </div>
  )
}