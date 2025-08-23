import type { Component, JSX } from 'solid-js'
import { onMount, onCleanup, createEffect, createSignal } from 'solid-js'
import Panzoom from '@panzoom/panzoom'
import './PanZoomSVG.css'

interface PanZoomSVGProps {
  svgElement?: SVGElement | null
}


export const PanZoomSVG: Component<PanZoomSVGProps> = (props) => {
  // outer div; expands to fit available space
  let panzoomContainerRef: HTMLDivElement | undefined
  // inner div controlled by panzoom (transformation applied here); always has same size as SVG
  let panzoomElementRef: HTMLDivElement | undefined
  // We give panzoomElementRef to panzoomInstance so that panzoom will transform this div 
  const [getPanzoomInstance, setPanzoomInstance] = createSignal<ReturnType<typeof Panzoom> | undefined>(undefined)

  // Initialize panzoom instance only
  const initializePanzoom = () => {
    if (!panzoomContainerRef || !panzoomElementRef || getPanzoomInstance()) return

    try {
      const panzoomInstance = Panzoom(panzoomElementRef, {
        maxScale: 10,
        minScale: 0.1,
        startScale: 1,
        animate: false, // Disable animation during initialization
        duration: 200,
        // Disable panning on text selection
        exclude: ['.panzoom-controls', '.panzoom-control-btn'],
        // Smooth animations
        transition: true,
        // Use the container as the canvas for capturing events
        canvas: panzoomContainerRef,
        // cursor: 'grab', // turns white and invisible in Chrome sometimes, so go with the default 'move'
      })

      panzoomContainerRef.addEventListener('wheel', panzoomInstance.zoomWithWheel)
      
      // Set the instance in the signal
      setPanzoomInstance(panzoomInstance)
      
      // If we have an SVG prop but no SVG in DOM, add it now
      const svgInDom = panzoomElementRef.querySelector('svg')
      if (props.svgElement && !svgInDom) {
        panzoomElementRef.replaceChildren(props.svgElement)
      }

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
    if (!panzoomElementRef || !props.svgElement) return
    
    // Only update if panzoom is initialized
    if (getPanzoomInstance()) {
      // Replace any existing content with the new SVG
      panzoomElementRef.replaceChildren(props.svgElement)
    }
  })

  onMount(() => {
    if (!panzoomContainerRef || !panzoomElementRef) return
    initializePanzoom()
  })

  onCleanup(() => {
    const instance = getPanzoomInstance()
    if (instance) {
      instance.destroy()
      setPanzoomInstance(undefined)
    }
  })

  // Public API methods
  const zoomIn = () => {
    const instance = getPanzoomInstance()
    if (instance) instance.zoomIn()
  }

  const zoomOut = () => {
    const instance = getPanzoomInstance()
    if (instance) instance.zoomOut()
  }

  const zoomToFit = () => {
    const instance = getPanzoomInstance()
    if (!instance) return
    
    // Just reset - let panzoom handle the fit
    instance.reset()
  }

  return (
    <div
      ref={(el) => { panzoomContainerRef = el }}
      class="panzoom-container"
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
        >
          ⌂
        </button>
      </div>

      {/* SVG Container - this is what gets panned/zoomed */}
      <div
        ref={(el) => { panzoomElementRef = el }}
        class="panzoom-element"
      >
        {/* Content is managed by createEffect, not JSX */}
      </div>
    </div>
  )
}