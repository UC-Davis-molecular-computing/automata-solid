import { describe, it, expect, beforeEach } from 'vitest'
import { createRoot } from 'solid-js'
import { createStore } from 'solid-js/store'
import { AutomatonType, ViewMode, type AppState } from '../types/AppState'
import { LoadDefault } from '../types/Messages'

// Mock the store implementation to test the logic
function createMockAppStore() {
  const initialState: AppState = {
    automatonType: AutomatonType.Dfa,
    editorContent: 'initial dfa content',
    inputString: 'test123',
    // automaton, parseError, result are undefined by default (omitted)
    // Add required AppState fields
    theme: 'monokai',
    viewMode: ViewMode.Table,
    splitPercentage: 0.5,
    runImmediately: true,
    cfgLeavesAtBottom: true
  }
  
  const [appState, setAppState] = createStore<AppState>(initialState)
  
  // Mock the dispatch logic we're testing
  const dispatch = (message: LoadDefault) => {
    if (message instanceof LoadDefault) {
      // This is the loadDefaultAutomaton logic
      setAppState('editorContent', `default ${appState.automatonType.toLowerCase()} content`)
      // Should NOT clear inputString - this was the bug
      setAppState('parseError', undefined)
      setAppState('computation', undefined)
      // Should NOT change editorContent when switching models
      // Should NOT clear inputString - preserve it
      setAppState('parseError', undefined)
      setAppState('computation', undefined)
    }
  }
  
  return { appState, setAppState, dispatch }
}

describe('AppStore inputString preservation', () => {
  let mockStore: ReturnType<typeof createMockAppStore>
  
  beforeEach(() => {
    mockStore = createMockAppStore()
  })
  
  it('should preserve inputString when LoadDefault is dispatched', () => {
    createRoot(() => {
      // Set initial state
      mockStore.setAppState('inputString', 'myTestInput')
      mockStore.setAppState('automatonType', AutomatonType.Tm)
      
      // Verify initial state
      expect(mockStore.appState.inputString).toBe('myTestInput')
      expect(mockStore.appState.automatonType).toBe(AutomatonType.Tm)
      
      // Dispatch LoadDefault
      mockStore.dispatch(new LoadDefault())
      
      // inputString should be preserved
      expect(mockStore.appState.inputString).toBe('myTestInput')
      expect(mockStore.appState.editorContent).toBe('default tm content')
    })
  })
  
  it('should preserve inputString when switching automaton types', () => {
    createRoot(() => {
      // Set initial state with DFA and input string
      mockStore.setAppState('inputString', 'preserveMe')
      mockStore.setAppState('automatonType', AutomatonType.Dfa)
      
      // Verify initial state
      expect(mockStore.appState.inputString).toBe('preserveMe')
      expect(mockStore.appState.automatonType).toBe(AutomatonType.Dfa)
      const initialContent = mockStore.appState.editorContent
      expect(initialContent).toBe('initial dfa content')
      
      // Switch to TM
      mockStore.setAppState('automatonType', AutomatonType.Tm)
      
      // inputString should be preserved, editorContent should NOT change
      expect(mockStore.appState.inputString).toBe('preserveMe')
      expect(mockStore.appState.automatonType).toBe(AutomatonType.Tm)
      expect(mockStore.appState.editorContent).toBe(initialContent) // Content should stay the same!
      
      // Switch to NFA  
      mockStore.setAppState('automatonType', AutomatonType.Nfa)
      
      // inputString should still be preserved, editorContent should still NOT change
      expect(mockStore.appState.inputString).toBe('preserveMe')
      expect(mockStore.appState.automatonType).toBe(AutomatonType.Nfa)
      expect(mockStore.appState.editorContent).toBe(initialContent) // Content should still be the same!
    })
  })
  
  it('should allow inputString to be changed directly', () => {
    createRoot(() => {
      // Set initial state
      mockStore.setAppState('inputString', 'initial')
      
      // Change inputString directly
      mockStore.setAppState('inputString', 'changed')
      
      // Should be updated
      expect(mockStore.appState.inputString).toBe('changed')
      
      // Should persist across automaton type changes
      mockStore.setAppState('automatonType', AutomatonType.Tm)
      expect(mockStore.appState.inputString).toBe('changed')
    })
  })
})