import { describe, it, expect } from 'vitest'
import { createRoot } from 'solid-js'
import { AutomatonType } from '../types/AppState'
import { LoadDefault } from '../types/Messages'
import { appState, setAppState, dispatch } from './AppStore'

describe('AppStore Integration Tests - inputString preservation', () => {
  
  it('should preserve inputString when LoadDefault is dispatched', () => {
    createRoot(() => {
      // Set initial state
      setAppState('inputString', 'myTestInput')
      setAppState('automatonType', AutomatonType.Tm)
      
      // Verify initial state
      expect(appState.inputString).toBe('myTestInput')
      expect(appState.automatonType).toBe(AutomatonType.Tm)
      
      // Dispatch LoadDefault
      dispatch(new LoadDefault())
      
      // inputString should be preserved
      expect(appState.inputString).toBe('myTestInput')
    })
  })
  
  it('should preserve inputString when switching automaton types', () => {
    createRoot(() => {
      // Set initial state with DFA and input string
      setAppState('inputString', 'preserveMe')
      setAppState('automatonType', AutomatonType.Dfa)
      
      // Verify initial state
      expect(appState.inputString).toBe('preserveMe')
      expect(appState.automatonType).toBe(AutomatonType.Dfa)
      
      const initialContent = appState.editorContent
      
      // Switch to TM
      setAppState('automatonType', AutomatonType.Tm)
      
      // inputString should be preserved, content should NOT change
      expect(appState.inputString).toBe('preserveMe')
      expect(appState.automatonType).toBe(AutomatonType.Tm)
      expect(appState.editorContent).toBe(initialContent) // Content should stay the same!
      
      // Switch to NFA
      setAppState('automatonType', AutomatonType.Nfa)
      
      // inputString should still be preserved
      expect(appState.inputString).toBe('preserveMe')
      expect(appState.automatonType).toBe(AutomatonType.Nfa)
    })
  })
  
  it('should test the exact scenario: change inputString, then change model', () => {
    createRoot(() => {
      // Start with DFA
      setAppState('automatonType', AutomatonType.Dfa)
      setAppState('inputString', 'abc123')
      
      expect(appState.inputString).toBe('abc123')
      expect(appState.automatonType).toBe(AutomatonType.Dfa)
      
      // Now change to TM (this is what the user is doing)
      setAppState('automatonType', AutomatonType.Tm)
      
      // Input string should still be there!
      expect(appState.inputString).toBe('abc123')
      expect(appState.automatonType).toBe(AutomatonType.Tm)
    })
  })
})