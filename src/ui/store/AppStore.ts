import { createStore } from 'solid-js/store'
import { createEffect, createRoot } from 'solid-js'
import type { AppState } from '../types/AppState'
import { AutomatonType, initialState } from '../types/AppState'
import type { AppMessage } from '../types/Messages'
import { LoadDefault, SaveFile, LoadFile, MinimizeDfa, RunTest, OpenFile, SaveFileAs,
  SetComputationResult, SetParseError } from '../types/Messages'
import { debounce } from '../utils/debounce'
import { saveToLocalStorage, loadFromLocalStorage, getPersistableState } from '../utils/localStorage'
import { DFAParser } from '../../parsers/DFAParser'
import { NFAParser } from '../../parsers/NFAParser'
import { TMParser } from '../../parsers/TMParser'
import { CFGParser } from '../../parsers/CFGParser'
import { RegexParser } from '../../parsers/RegexParser'
import { ParserUtil } from '../../parsers/ParserUtil'

// ========================================
// GLOBAL STORE (initialized with localStorage or defaults)
// ========================================

// Load from localStorage and merge with defaults
function createInitialState(): AppState {
  const defaultState: AppState = {
    ...initialState,
    editorContent: ParserUtil.getDefaultContent(AutomatonType.Dfa),
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
        mergedState.editorContent = ParserUtil.getDefaultContent(stored.automatonType)
        // Don't clear inputString - let it be restored from localStorage or keep default
      }
    }
    
    // Restore all persistable fields automatically
    Object.assign(mergedState, stored)
    
    return mergedState
  }
  
  return defaultState
}

export const [appState, setAppState] = createStore<AppState>(createInitialState())


// ========================================
// COMPLEX MESSAGE-BASED UPDATES (for business logic)
// ========================================

export const dispatch = (message: AppMessage): void => {
  // instanceof checks for type-safe message handling
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
  } else if (message instanceof SetComputationResult) {
    setAppState('result', message.result)
    setAppState('parseError', undefined)
  } else if (message instanceof SetParseError) {
    setAppState('parseError', message.error)
    setAppState('result', undefined)
  } else {
    // Fallback for unknown message types
    console.error('Unhandled message type:', message.constructor.name)
  }
}

// ========================================
// COMPLEX BUSINESS LOGIC FUNCTIONS
// ========================================

const loadDefaultAutomaton = (type: AutomatonType): void => {
  // Load default YAML content for the given automaton type
  // Let the reactive system handle parsing, validation, and computation
  setAppState('editorContent', ParserUtil.getDefaultContent(type))
}

const saveAutomatonToFile = (): void => {
  // Save current automaton to file
  if (!appState.editorContent.trim()) {
    setAppState('parseError', 'Cannot save empty automaton')
    return
  }
  
  // Use automaton type as file extension for better type detection
  const extension = appState.automatonType.toLowerCase()
  const filename = `${appState.automatonType.toLowerCase()}.${extension}`
  downloadFile(filename, appState.editorContent)
  setAppState('parseError', undefined)
}

const loadAutomatonFromFile = (content: string): void => {
  // Complex logic: parse, validate, update multiple fields
  try {
    // TODO: Parse and validate file content
    setAppState('editorContent', content)
    setAppState('parseError', undefined)
    setAppState('result', undefined)
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
  console.log('[UNIMPLEMENTED] Minimizing DFA...')
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

// ========================================
// CENTRALIZED AUTOMATON PARSING 
// ========================================

// Create effect to parse automaton when editorContent or automatonType changes
createRoot(() => {
  createEffect(() => {
    try {
      let automaton = undefined
      
      // Parse based on automaton type
      switch (appState.automatonType) {
        case AutomatonType.Dfa:
          const dfaParser = new DFAParser()
          automaton = dfaParser.parseDFA(appState.editorContent)
          break
        case AutomatonType.Nfa:
          const nfaParser = new NFAParser()
          automaton = nfaParser.parseNFA(appState.editorContent)
          break
        case AutomatonType.Tm:
          const tmParser = new TMParser()
          automaton = tmParser.parseTM(appState.editorContent)
          break
        case AutomatonType.Cfg:
          const cfgParser = new CFGParser()
          automaton = cfgParser.parseCFG(appState.editorContent)
          break
        case AutomatonType.Regex:
          const regexParser = new RegexParser()
          automaton = regexParser.parseRegex(appState.editorContent)
          break
        default:
          throw new Error(`Unknown automaton type: ${appState.automatonType}`)
      }
      
      // Successfully parsed - store automaton and clear errors
      setAppState('automaton', automaton)
      setAppState('parseError', undefined)
      
    } catch (error) {
      // Parsing failed - clear automaton and store error
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
      setAppState('automaton', undefined)
      setAppState('parseError', errorMessage)
      setAppState('result', undefined) // Clear results when parsing fails
    }
  })
})

// ========================================
// CENTRALIZED COMPUTATION (when runImmediately is enabled)
// ========================================

// Create effect to run computation when automaton, inputString, or runImmediately changes
let appStoreEffectCallCount = 0
createRoot(() => {
  createEffect(() => {
    if (appState.automaton && appState.runImmediately) {
      appStoreEffectCallCount++
      console.log(`[AppStore createEffect] Called ${appStoreEffectCallCount} times with runImmediately=true`)
      console.log(`[AppStore createEffect] Input length: ${appState.inputString.length}`)
      const effectStart = performance.now()
      
      try {
        // Handle type-specific computation - avoid duplicate calls for TMs
        let accepts: boolean
        let outputString: string | undefined = undefined
        
        switch (appState.automatonType) {
          case AutomatonType.Tm:
            // For TMs, do computation once and get both results
            console.log('[AppStore createEffect] TM: calling getConfigDiffsAndFinalConfig once...')
            const t1 = performance.now()
            const tm = appState.automaton as import('../../core/TM').TM
            const { finalConfig } = tm.getConfigDiffsAndFinalConfig(appState.inputString)
            accepts = finalConfig.state === tm.acceptState
            outputString = finalConfig.outputString()
            const t2 = performance.now()
            console.log(`[AppStore createEffect] TM computation took ${(t2 - t1).toFixed(2)}ms`)
            break
          default:
            // For other automata, use the accepts method
            console.log('[AppStore createEffect] Calling accepts...')
            const t3 = performance.now()
            accepts = appState.automaton.accepts(appState.inputString)
            const t4 = performance.now()
            console.log(`[AppStore createEffect] accepts took ${(t4 - t3).toFixed(2)}ms`)
            break
        }
        
        // Handle remaining type-specific output generation (non-TM cases)
        switch (appState.automatonType) {
          case AutomatonType.Tm:
            // Already handled above
            break
          case AutomatonType.Cfg:
            // CFG needs type assertion for parse tree generation
            const cfg = appState.automaton as import('../../core/CFG').CFG
            if (accepts) {
              outputString = cfg.parseTree(appState.inputString)?.toTreeString()
            }
            break
          case AutomatonType.Dfa:
          case AutomatonType.Nfa:
          case AutomatonType.Regex:
            // These don't generate output strings
            break
          default:
            throw new Error(`Unknown automaton type: ${appState.automatonType}`)
        }
        
        // Store computation result
        console.log('[AppStore createEffect] Setting result in AppState...')
        const t5 = performance.now()
        setAppState('result', { accepts, outputString })
        const t6 = performance.now()
        console.log(`[AppStore createEffect] setAppState took ${(t6 - t5).toFixed(2)}ms`)
        
      } catch (error) {
        // Computation failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown computation error'
        setAppState('result', { accepts: false, error: errorMessage })
      }
      
      const effectEnd = performance.now()
      console.log(`[AppStore createEffect] TOTAL TIME: ${(effectEnd - effectStart).toFixed(2)}ms`)
      console.log('[AppStore createEffect] Effect completed')
    }
  })
})


const runAutomatonTest = (): void => {
  // Complex logic: parse YAML, run automaton, update results
  try {
    // TODO: Parse YAML and test input
    const accepts = Math.random() > 0.5 // Placeholder
    const outputString = Math.random() > 0.7 ? 'sample output' : undefined // Placeholder for TM output
    setAppState('result', {
      accepts,
      outputString,
      error: undefined
    })
    setAppState('parseError', undefined)
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
          setAppState('parseError', undefined)
          setAppState('result', undefined)
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