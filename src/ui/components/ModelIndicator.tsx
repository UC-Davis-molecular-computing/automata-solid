import type { Component } from 'solid-js'
import { appState } from '../store/AppStore'
import './ModelIndicator.css'

export const ModelIndicator: Component = () => {
  return (
    <div class="model-indicator">
      <span class="model-type-label">
        {appState.automatonType.toUpperCase()} Simulator
      </span>
    </div>
  )
}