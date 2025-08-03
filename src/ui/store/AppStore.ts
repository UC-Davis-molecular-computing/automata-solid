import { createStore } from 'solid-js/store'
import { createEffect, createRoot } from 'solid-js'
import type { AppState } from '../types/AppState'
import { AutomatonType, initialState } from '../types/AppState'
import type { AppMessage } from '../types/Messages'
import { LoadDefault, SaveFile, LoadFile, MinimizeDfa, RunTest, OpenFile, SaveFileAs } from '../types/Messages'
import { debounce } from '../utils/debounce'
import { saveToLocalStorage, loadFromLocalStorage, getPersistableState } from '../utils/localStorage'
// Message types are handled via discriminated union, no need to import individual interfaces

// ========================================
// HELPER FUNCTIONS (defined first so we can use them for initialization)
// ========================================

const getDefaultYamlFor = (type: AutomatonType): string => {
  switch (type) {
    case AutomatonType.Dfa:
      return `# DFA recognizing { x in {0,1}* | x does not end in 000 }

states: 
  - q      # last bit was a 1 or non-existent
  - q0     # last two bits were 10
  - q00    # last three bits were 100
  - q000   # last three bits were 000

input_alphabet: [0, 1]

# no last bit when we start
start_state: q

# accept if last three bits were not 000
accept_states: [q, q0, q00]

delta:
  # if we see a 1, reset
  q:
    1: q
    0: q0    # if we see a 0, count one more 0 than before
  q0:
    1: q
    0: q00
  q00:
    1: q
    0: q000
  q000:
    1: q
    0: q000  # until we get to three`

    case AutomatonType.Nfa:
      return `# NFA recognizing { x in {0,1}* | third-to-last bit of x is 0 }

states: [q1, q2, q3, q4]
input_alphabet: [0, 1]
start_state: q1
accept_states: [q4]

delta:
  q1:
    0: [q1, q2]
    1: q1
  q2:
    0: q3
    1: q3
  q3:
    0: q4
    1: q4
`

    case AutomatonType.Regex:
      return `# Matches any binary string containing the substring 010
B = (0|1)*  # subexpression matching any binary string
B 010 B`

    case AutomatonType.Cfg:
      return `# CFG generating language of balanced () parentheses

S: [(S), SS, '']  # wrap in parentheses, concatenate, or empty`

    case AutomatonType.Tm:
      return `# TM deciding { w in {0,1}* | w = w^R } (palindromes)

states: [s, r00, r11, r01, r10, l, lx, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: [x, _]
start_state: s
accept_state: qA
reject_state: qR

delta:
  s:
    0: [r00, x, R]
    1: [r11, x, R]
    x: [qA, x, S]    # empty string is palindrome
  r00:
    0: [r00, 0, R]
    1: [r01, 1, R]
    _: [lx, _, L]
    x: [lx, x, L]
  r01:
    0: [r00, 0, R]
    1: [r01, 1, R]
  r10:
    0: [r10, 0, R]
    1: [r11, 1, R]
  r11:
    0: [r10, 0, R]
    1: [r11, 1, R]
    _: [lx, _, L]
    x: [lx, x, L]
  lx:
    0: [l, x, L]
    1: [l, x, L]
    x: [qA, x, S]    # all matched
  l:
    0: [l, 0, L]
    1: [l, 1, L]
    x: [s, x, R]`

    default:
      return ''
  }
}


// ========================================
// GLOBAL STORE (initialized with localStorage or defaults)
// ========================================

// Load from localStorage and merge with defaults
function createInitialState(): AppState {
  const defaultState: AppState = {
    ...initialState,
    editorContent: getDefaultYamlFor(AutomatonType.Dfa),
    inputString: ''
  }
  
  // Try to load from localStorage
  const stored = loadFromLocalStorage()
  if (stored) {
    // Merge stored state with defaults, with special handling for editor content
    const mergedState = { ...defaultState }
    
    // Restore these fields if they exist in localStorage
    if (stored.automatonType) {
      mergedState.automatonType = stored.automatonType
      // When automaton type is restored, load its default content if no editor content is stored
      if (!stored.editorContent) {
        mergedState.editorContent = getDefaultYamlFor(stored.automatonType)
        mergedState.inputString = ''
      }
    }
    
    // Restore all persistable fields automatically
    Object.assign(mergedState, stored)
    
    return mergedState
  }
  
  console.log('🆕 Using default state (no localStorage data found)')
  return defaultState
}

export const [appState, setAppState] = createStore<AppState>(createInitialState())


// ========================================
// COMPLEX MESSAGE-BASED UPDATES (for business logic)
// ========================================

export const dispatch = (message: AppMessage): void => {
  // Ultra-clean instanceof checks - zero boilerplate!
  if (message instanceof LoadDefault) {
    loadDefaultAutomaton(appState.automatonType)
  } else if (message instanceof SaveFile) {
    saveAutomatonToFile()
  } else if (message instanceof LoadFile) {
    loadAutomatonFromFile(message.content)
  } else if (message instanceof MinimizeDfa) {
    minimizeDfaAutomaton()
  } else if (message instanceof RunTest) {
    runAutomatonTest()
  } else if (message instanceof OpenFile) {
    openFileDialog()
  } else if (message instanceof SaveFileAs) {
    saveFileAs(message.filename, message.content)
  } else {
    // Fallback for unknown message types
    console.error('Unhandled message type:', message.constructor.name)
  }
}

// ========================================
// COMPLEX BUSINESS LOGIC FUNCTIONS
// ========================================

const loadDefaultAutomaton = (type: AutomatonType): void => {
  // Complex logic that might update multiple parts of state
  setAppState('editorContent', getDefaultYamlFor(type))
  setAppState('inputString', '')
  setAppState('parseError', null)
  setAppState('result', null)
}

const saveAutomatonToFile = (): void => {
  // Save current automaton to file
  if (!appState.editorContent.trim()) {
    setAppState('parseError', 'Cannot save empty automaton')
    return
  }
  
  // Use automaton type as file extension for better type detection
  const extension = appState.automatonType.toLowerCase()
  const filename = `${appState.automatonType}-${Date.now()}.${extension}`
  downloadFile(filename, appState.editorContent)
  setAppState('parseError', null)
}

const loadAutomatonFromFile = (content: string): void => {
  // Complex logic: parse, validate, update multiple fields
  try {
    // TODO: Parse and validate file content
    setAppState('editorContent', content)
    setAppState('parseError', null)
    setAppState('result', null)
    console.log('File loaded successfully')
  } catch (error) {
    setAppState('parseError', `Failed to load file: ${error}`)
  }
}

const minimizeDfaAutomaton = (): void => {
  // Complex algorithm that affects multiple state pieces
  if (appState.automatonType !== AutomatonType.Dfa) {
    setAppState('parseError', 'Can only minimize DFA automata')
    return
  }
  
  // TODO: Implement DFA minimization algorithm
  console.log('Minimizing DFA...')
}

// ========================================
// LOCALSTORAGE PERSISTENCE (using createEffect)
// ========================================

// Debounced save function to avoid excessive localStorage writes during typing
const debouncedSave = debounce((state: Parameters<typeof saveToLocalStorage>[0]) => {
  saveToLocalStorage(state)
}, 500) // Wait 500ms after last change before saving

// Create effect to automatically save relevant state to localStorage
// Wrap in createRoot to properly dispose of the effect
createRoot(() => {
  createEffect(() => {
    // Automatically extract all persistable fields (excludes parseError and result)
    const stateToPersist = getPersistableState(appState)
    
    // Use debounced save to avoid saving on every keystroke
    debouncedSave(stateToPersist)
  })
})

// For debugging - expose function to clear localStorage
if (typeof window !== 'undefined') {
  (window as any).clearAutomataStorage = () => {
    const { clearLocalStorage } = require('../utils/localStorage')
    clearLocalStorage()
    console.log('localStorage cleared. Refresh the page to see default state.')
  }
}

const runAutomatonTest = (): void => {
  // Complex logic: parse YAML, run automaton, update results
  try {
    // TODO: Parse YAML and test input
    const accepts = Math.random() > 0.5 // Placeholder
    const outputString = Math.random() > 0.7 ? 'sample output' : null // Placeholder for TM output
    setAppState('result', {
      accepts,
      outputString,
      error: undefined
    })
    setAppState('parseError', null)
  } catch (error) {
    setAppState('result', { accepts: false, error: String(error) })
  }
}

// ========================================
// FILE I/O FUNCTIONS
// ========================================

const openFileDialog = (): void => {
  // Create file input element
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.dfa,.nfa,.regex,.cfg,.tm,.yaml,.yml,.txt'
  input.style.display = 'none'
  
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        if (content) {
          // Detect automaton type from file extension
          const automatonType = getAutomatonTypeFromFilename(file.name)
          
          // Load the file content and switch automaton type
          setAppState('editorContent', content)
          setAppState('automatonType', automatonType)
          setAppState('parseError', null)
          setAppState('result', null)
        }
      }
      reader.onerror = () => {
        setAppState('parseError', 'Failed to read file')
      }
      reader.readAsText(file)
    }
    // Clean up
    document.body.removeChild(input)
  }
  
  // Trigger file dialog
  document.body.appendChild(input)
  input.click()
}

const downloadFile = (filename: string, content: string): void => {
  // Create download link
  const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  // Trigger download
  document.body.appendChild(link)
  link.click()
  
  // Clean up
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const saveFileAs = (filename: string, content: string): void => {
  downloadFile(filename, content)
}

// Helper function to determine automaton type from filename
const getAutomatonTypeFromFilename = (filename: string): AutomatonType => {
  const extension = filename.toLowerCase().split('.').pop()
  
  switch (extension) {
    case 'dfa':
      return AutomatonType.Dfa
    case 'nfa':
      return AutomatonType.Nfa
    case 'regex':
      return AutomatonType.Regex
    case 'cfg':
      return AutomatonType.Cfg
    case 'tm':
      return AutomatonType.Tm
    default:
      // For .yaml, .yml, .txt, or unknown extensions, keep current type
      return appState.automatonType
  }
}