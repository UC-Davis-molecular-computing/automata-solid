# Fit-to-View Zoom Issue

## Problem Description

**Issue**: After fixing the graph view switching bug, the "Fit to View" button (⌂) in the PanZoom controls now zooms the graph too small instead of properly fitting it to the available container space.

**When it occurs**: 
- User switches to Graph view (graph now appears correctly ✅)
- User clicks the "Fit to View" button (⌂ icon)
- Graph becomes too small relative to the container size

**Expected behavior**: Graph should scale to fit the available container space optimally, using most of the visible area while maintaining aspect ratio.

**Actual behavior**: Graph scales to a smaller size than optimal, leaving excessive whitespace around it.

## Context - What Changed

### Before the Fix
- Manual DOM manipulation: `svgContainerRef.appendChild(clonedSvg)`
- PanZoom had direct access to the manually added SVG element
- Fit-to-view worked correctly with the manually managed SVG

### After the Fix  
- SolidJS-managed DOM: `innerHTML={props.svgElement ? props.svgElement.outerHTML : ''}`
- PanZoom operates on the SolidJS-rendered SVG content
- SVG dimensions and container relationship may have changed

## Technical Details

### Root Cause Hypothesis
The issue likely stems from one or more of these factors:

1. **SVG Dimension Changes**: Our fix modified how SVG dimensions are set:
   ```typescript
   // GraphRenderer.ts - we now set explicit pixel dimensions
   svg.setAttribute('width', `${width}px`)
   svg.setAttribute('height', `${height}px`)
   ```

2. **Container Size Calculation**: PanZoom's `reset()` method may be calculating container bounds differently when SVG is managed by SolidJS vs manually added

3. **CSS Styling Differences**: The `innerHTML` approach might result in different computed styles compared to `appendChild()`

4. **Timing Issues**: SolidJS reactive updates might affect when PanZoom calculates optimal zoom levels

### Current PanZoom Implementation
```typescript
// PanZoomSVG.tsx
const zoomToFit = () => {
  if (!panzoomInstance) return
  panzoomInstance.reset()  // ← This is now too conservative
  savePanZoomState()
}
```

## Investigation Steps

When tackling this bug, consider:

1. **Compare SVG and container dimensions**:
   - Log actual SVG `getBoundingClientRect()` 
   - Log container `getBoundingClientRect()`
   - Compare with pre-fix dimensions

2. **Test different reset approaches**:
   - Try `panzoomInstance.zoom(calculateOptimalZoom(), { animate: false })`
   - Test manual zoom calculation based on container/SVG ratio

3. **Check CSS differences**:
   - Compare computed styles of SVG before/after innerHTML approach
   - Verify container styles haven't changed

4. **Timing investigation**:
   - Test if delaying `reset()` call helps
   - Check if SVG dimensions are fully resolved when reset() is called

## Potential Solutions

### Option 1: Custom Zoom Calculation
```typescript
const zoomToFit = () => {
  if (!panzoomInstance || !svgContainerRef) return
  
  const containerBounds = containerRef.getBoundingClientRect()
  const svgBounds = svgContainerRef.querySelector('svg')?.getBoundingClientRect()
  
  if (containerBounds && svgBounds) {
    const scaleX = containerBounds.width / svgBounds.width
    const scaleY = containerBounds.height / svgBounds.height
    const optimalScale = Math.min(scaleX, scaleY) * 0.9 // 90% to leave some padding
    
    panzoomInstance.zoom(optimalScale, { animate: false })
    panzoomInstance.pan(0, 0, { animate: false })
  }
}
```

### Option 2: Restore Pre-Fix Zoom Behavior
- Investigate what zoom level was used before the fix
- Hard-code that zoom level as a temporary workaround
- Compare with current reset() behavior

### Option 3: PanZoom Configuration
- Adjust PanZoom initialization options
- Modify `startScale`, `maxScale`, or `minScale` parameters
- Test different `canvas` or sizing configurations

## Files to Examine

- `src/ui/components/PanZoomSVG.tsx` - Main PanZoom logic and zoomToFit function
- `src/ui/utils/GraphRenderer.ts` - SVG dimension setting
- `src/ui/components/PanZoomSVG.css` - Container and element styling
- Check PanZoom library documentation for reset() behavior changes

## Success Criteria

✅ **Fit-to-View button scales graph to use ~80-90% of available container space**  
✅ **Graph remains centered after fit-to-view**  
✅ **Aspect ratio is preserved**  
✅ **Behavior is consistent across DFA/NFA/TM components**  
✅ **No regression in view switching (our previous fix still works)**

## Priority

**Medium** - Functionality works, but user experience is degraded. Users can manually zoom to desired level as a workaround.

---

*Created after fixing the primary graph view switching bug on 2025-08-22*