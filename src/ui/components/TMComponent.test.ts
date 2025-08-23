import { describe, it, expect } from 'vitest'
import { createRoot } from 'solid-js'
import { createStore } from 'solid-js/store'
import { AutomatonType, ViewMode, type AppState } from '../types/AppState'

describe('TM Component Input String Changes', () => {
  
  it('should reproduce the input string change issue', () => {
    createRoot(() => {
      // Mock app state using proper AppState interface
      const initialState: AppState = {
        automatonType: AutomatonType.Tm,
        editorContent: `# TM deciding { w in {0,1}* | w = w^R } (palindromes)
states: [qstart, qaccept, qreject, qleft, qright, qmid]
input_alphabet: ['0', '1']
tape_alphabet: ['0', '1', '_', 'X']
start_state: qstart
accept_state: qaccept
reject_state: qreject
delta:
  qstart:
    '0': [qleft, 'X', 'R']
    '1': [qleft, 'X', 'R'] 
    '_': [qaccept, '_', 'R']
  qleft:
    '0': [qleft, '0', 'R']
    '1': [qleft, '1', 'R']
    '_': [qright, '_', 'L']
  qright:
    '0': [qmid, '_', 'L']
    '1': [qmid, '_', 'L']
    'X': [qstart, 'X', 'R']
    '_': [qreject, '_', 'R']
  qmid:
    '0': [qmid, '0', 'L'] 
    '1': [qmid, '1', 'L']
    'X': [qstart, 'X', 'R']`,
        inputString: 'abc',
        runImmediately: false,
        // Required AppState fields
        theme: 'monokai',
        viewMode: ViewMode.Table,
        splitPercentage: 0.5,
        cfgLeavesAtBottom: true,
        // automaton, parseError, result are undefined by default (omitted)
      }
      
      const [appState, setAppState] = createStore<AppState>(initialState)
      
      // Mock TM state - removed unused variables
      // const [tmState, setTmState] = createStore({
      //   tm: null as any,
      //   error: null as string | null,
      //   currentConfig: null as any,
      //   initialConfig: null as any,
      //   hasResult: false
      // })
      
      // Simulate the user changing input string
      setAppState('inputString', 'newInput123')
      
      expect(appState.inputString).toBe('newInput123')
      
      // Simulate switching to DFA
      setAppState('automatonType', AutomatonType.Dfa)
      setAppState('editorContent', 'states: [q0, q1]\\ninput_alphabet: [0, 1]\\n...')
      
      // Input string should still be preserved
      expect(appState.inputString).toBe('newInput123')
      
      // Switch back to TM
      setAppState('automatonType', AutomatonType.Tm)
      setAppState('editorContent', appState.editorContent) // Load TM content
      
      // Input string should still be there
      expect(appState.inputString).toBe('newInput123')
    })
  })
})