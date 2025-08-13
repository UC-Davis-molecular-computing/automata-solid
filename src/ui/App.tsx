import type { Component } from 'solid-js'
import { Show, createSignal, onMount, onCleanup } from 'solid-js'
import Resizable from '@corvu/resizable'
import { MenuBar } from './components/MenuBar'
import { ModelIndicator } from './components/ModelIndicator'
import { CodeEditor } from './components/CodeEditor'
import { DFAComponent } from './components/DFAComponent'
import { NFAComponent } from './components/NFAComponent'
import { TMComponent } from './components/TMComponent'
import { RegexComponent } from './components/RegexComponent'
import { CFGComponent } from './components/CFGComponent'
import { TM } from '../core/TM'
import { DFA } from '../core/DFA'
import { NFA } from '../core/NFA'
import { Regex } from '../core/Regex'
import { CFG } from '../core/CFG'
import { appState, setAppState, dispatch } from './store/AppStore'
import { AutomatonType } from './types/AppState'
import { LoadDefault, SaveFile, OpenFile, TriggerComputation } from './types/Messages'
import type { NavigationControls } from './types/NavigationControls'
import './App.css'

const App: Component = () => {
  // State for navigation controls from active automaton visualization
  const [navigationControls, setNavigationControls] = createSignal<NavigationControls | undefined>()
  // Computation results are now tracked in the global store instead of local state
  
  // Result changes are now handled via global store messages instead of callbacks
  
  
  // Save split percentage when it changes
  const handleSplitChange = (sizes: number[]) => {
    const newPercentage = sizes[0] // First panel percentage
    setAppState('splitPercentage', newPercentage)
  }
  
  // Keyboard event handler for navigation shortcuts and global shortcuts
  const handleKeyDown = (event: KeyboardEvent) => {
    // Handle global shortcuts first (Ctrl+key combinations)
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'o':
          event.preventDefault()
          dispatch(new OpenFile())
          return
        case 's':
          event.preventDefault()
          dispatch(new SaveFile())
          return
        case 'l':
          event.preventDefault()
          dispatch(new LoadDefault())
          return
      }
    }
    
    // Handle navigation shortcuts only when not in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }
    
    const controls = navigationControls()
    if (!controls) return
    
    switch (event.key) {
      case ',':
      case 'ArrowLeft':
        event.preventDefault()
        if (controls.canGoBackward()) {
          controls.goBackward()
        }
        break
      case '.':
      case 'ArrowRight':
        event.preventDefault()
        if (controls.canGoForward()) {
          controls.goForward()
        }
        break
      case 'Home':
        event.preventDefault()
        controls.goToBeginning()
        break
      case 'End':
        event.preventDefault()
        controls.goToEnd()
        break
    }
  }
  
  // Set up keyboard event listeners
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
  })
  
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })
  
  // Navigation button handlers
  const handleGoToBeginning = () => {
    const controls = navigationControls()
    if (controls) controls.goToBeginning()
  }
  
  const handleGoBackward = () => {
    const controls = navigationControls()
    if (controls) controls.goBackward()
  }
  
  const handleGoForward = () => {
    const controls = navigationControls()
    if (controls) controls.goForward()
  }
  
  const handleGoToEnd = () => {
    const controls = navigationControls()
    if (controls) controls.goToEnd()
  }
  
  // Check if navigation is available for current automaton type
  const hasNavigation = () => {
    return appState.automatonType === AutomatonType.Dfa || 
           appState.automatonType === AutomatonType.Nfa ||
           appState.automatonType === AutomatonType.Tm
    // Regex and CFG don't need navigation controls
  }
  
  return (
    <div class="app">
      
      {/* Header with Menu Bar and Model Indicator */}
      <div class="header-bar" data-type={appState.automatonType}>
        <MenuBar />
        <ModelIndicator />
      </div>
      
      
      {/* Placeholder sections */}
      <div class="main-content">
        <div class="input-controls">
          <input 
            type="text" 
            placeholder="type input string here" 
            value={appState.inputString}
            onInput={(e) => setAppState('inputString', e.currentTarget.value)}
            size={37}
          />
          <Show when={hasNavigation()}>
            <div class="step-controls">
              <button 
                title="go to beginning (Home key)"
                onClick={handleGoToBeginning}
                disabled={!navigationControls()?.canGoBackward()}
              >
                |&lt;&lt;
              </button>
              <button 
                title="backward one step (⭠ key or ,)"
                onClick={handleGoBackward}
                disabled={!navigationControls()?.canGoBackward()}
              >
                &lt; (,)
              </button>
              <button 
                title="forward one step (⭢ key or .)"
                onClick={handleGoForward}
                disabled={!navigationControls()?.canGoForward()}
              >
                &gt; (.)
              </button>
              <button 
                title="go to end (End key)"
                onClick={handleGoToEnd}
                disabled={!navigationControls()?.canGoForward()}
              >
                &gt;&gt;|
              </button>
            </div>
          </Show>
          <div 
            title="When checked, computations run automatically as you type. When unchecked, use the Run button to compute results manually. Useful for TMs that may take time to process."
          >
            <label>
              <input 
                type="checkbox" 
                checked={appState.runImmediately}
                onChange={(e) => setAppState('runImmediately', e.currentTarget.checked)}
              />
              Run immediately?
            </label>
            <Show when={!appState.runImmediately}>
              <button 
                class="run-button"
                onClick={() => dispatch(new TriggerComputation(appState.automatonType))}
              >
                Run
              </button>
            </Show>
          </div>
          <Show when={!appState.parseError && appState.computation}>
            <div class="acceptance-status">
              <Show when={appState.computation}>
                <Show when={appState.automatonType === AutomatonType.Tm && appState.computation?.error === 'MAX_STEPS_REACHED'} fallback={
                  <>
                    <span class={appState.computation?.accepts ? 'accepted' : 'rejected'}>
                      {appState.computation?.accepts ? 'accept' : 'reject'}
                    </span>
                    <Show when={appState.automatonType === AutomatonType.Tm && appState.computation?.outputString !== undefined}>
                      <span title="This is the string on the last tape, starting at the tape head, until the first _ to the right of there." class="tm-output">
                        string output: <span class="output-string">{appState.computation?.outputString || 'ε'}</span>
                      </span>
                    </Show>
                  </>
                }>
                  <span class="max-steps-reached">MAX_STEPS={TM.MAX_STEPS.toLocaleString()} limit reached</span>
                </Show>
              </Show>
              <Show when={!appState.computation}>
                <span>Click Run to see result</span>
              </Show>
            </div>
          </Show>
        </div>
        
        <div class="split-content">
          <Resizable sizes={[appState.splitPercentage, 1 - appState.splitPercentage]} onSizesChange={handleSplitChange}>
            <Resizable.Panel minSize={0.01}>
              <div class="editor-section">
                <CodeEditor />
              </div>
            </Resizable.Panel>
            
            <Resizable.Handle aria-label="Resize editor and results panels">
              <div class="resize-handle" />
            </Resizable.Handle>
            
            <Resizable.Panel minSize={0.01}>
              <div class="results-section">
                {/* Centralized Error Display */}
                <Show when={appState.parseError}>
                  <div class="error-message">
                    <strong>Error:</strong>
                    <pre class="error-text">{appState.parseError}</pre>
                  </div>
                </Show>
                
                <Show when={appState.automatonType === AutomatonType.Dfa && appState.automaton && appState.automaton instanceof DFA}>
                  <DFAComponent 
                    dfa={appState.automaton as DFA}
                    onNavigationReady={setNavigationControls}
                  />
                </Show>
                <Show when={appState.automatonType === AutomatonType.Nfa && appState.automaton && appState.automaton instanceof NFA}>
                  <NFAComponent 
                    nfa={appState.automaton as NFA}
                    onNavigationReady={setNavigationControls}
                  />
                </Show>
                <Show when={appState.automatonType === AutomatonType.Tm && appState.automaton && appState.automaton instanceof TM}>
                  <TMComponent 
                    tm={appState.automaton as TM}
                    onNavigationReady={setNavigationControls}
                  />
                </Show>
                <Show when={appState.automatonType === AutomatonType.Regex && appState.automaton && appState.automaton instanceof Regex}>
                  <RegexComponent 
                    regex={appState.automaton as Regex}
                  />
                </Show>
                <Show when={appState.automatonType === AutomatonType.Cfg && appState.automaton && appState.automaton instanceof CFG}>
                  <CFGComponent 
                    cfg={appState.automaton as CFG}
                  />
                </Show>
              </div>
            </Resizable.Panel>
          </Resizable>
        </div>
      </div>
    </div>
  )
}

export default App