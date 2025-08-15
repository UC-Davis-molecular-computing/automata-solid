import { createStore } from 'solid-js/store'
import { createEffect, createRoot } from 'solid-js'
import type { AppState } from '../types/AppState'
import { AutomatonType, getDefaultInitialState } from '../types/AppState'
import type { AppMessage } from '../types/Messages'
import {
  LoadDefault, SaveFile, LoadFile, MinimizeDfa, RunTest, OpenFile, SaveFileAs,
  SetComputationResult, SetParseError, NavigateForward, NavigateBackward,
  NavigateToBeginning, NavigateToEnd, TriggerComputation, RegisterNavigationControls
} from '../types/Messages'
import { debounce } from '../utils/debounce'
import { saveToLocalStorage, loadFromLocalStorage, getPersistableState } from '../utils/localStorage'
import { DFAParser } from '../../parsers/DFAParser'
import { NFAParser } from '../../parsers/NFAParser'
import { TMParser } from '../../parsers/TMParser'
import { CFGParser } from '../../parsers/CFGParser'
import { RegexParser } from '../../parsers/RegexParser'
import { ParserUtil } from '../../parsers/ParserUtil'
import type { Automaton } from '../../core/Automaton'

// ========================================
// GLOBAL STORE (initialized with localStorage or defaults)
// ========================================

// Load from localStorage and merge with defaults
function createInitialState(): AppState {
  const defaultState: AppState = { ...getDefaultInitialState() }

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
      }
    }

    // Restore all persistable fields automatically
    Object.assign(mergedState, stored)

    return mergedState
  } else {
    return defaultState
  }
}

export const [appState, setAppState] = createStore<AppState>(createInitialState())


// ========================================
// COMPLEX MESSAGE-BASED UPDATES (for business logic)
// ========================================

export const dispatch = (message: AppMessage): void => {
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
    setAppState('computation', message.computation)
    setAppState('parseError', undefined)
  } else if (message instanceof SetParseError) {
    setAppState('parseError', message.error)
    setAppState('computation', undefined)
  } else if (message instanceof NavigateForward) {
    navigateForward()
  } else if (message instanceof NavigateBackward) {
    navigateBackward()
  } else if (message instanceof NavigateToBeginning) {
    navigateToBeginning()
  } else if (message instanceof NavigateToEnd) {
    navigateToEnd()
  } else if (message instanceof TriggerComputation) {
    // Handle manual computation trigger
    if (appState.automaton && message.automatonType === appState.automatonType) {
      const computation = runUnifiedComputation(
        appState.automaton,
        appState.automatonType,
        appState.inputString
      )
      setAppState('computation', computation)
      setAppState('parseError', undefined)
    }
  } else if (message instanceof RegisterNavigationControls) {
    setAppState('navigationControls', message.controls)
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
    setAppState('editorContent', content)
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
// UNIFIED COMPUTATION FUNCTION
// ========================================

const runUnifiedComputation = (automaton: Automaton, automatonType: AutomatonType, inputString: string) => {
  // Type-specific computation with ExecutionData generation
  switch (automatonType) {
    case AutomatonType.Tm: {
      const tm = automaton as import('../../core/TM').TM
      const { diffs, finalConfig } = tm.getConfigDiffsAndFinalConfig(inputString)
      const initialConfig = tm.initialConfig(inputString)

      const accepts = finalConfig.state === tm.acceptState
      const outputString = finalConfig.outputString()

      // Check if we hit the MAX_STEPS limit
      const TM = tm.constructor as typeof import('../../core/TM').TM
      const hitMaxSteps = diffs.length === TM.MAX_STEPS && !finalConfig.isHalting()
      const error = hitMaxSteps ? 'MAX_STEPS_REACHED' : undefined

      return {
        accepts,
        outputString,
        error,
        navigation: {
          currentStep: 0,
          totalSteps: diffs.length,
          executionData: {
            type: 'tm' as const,
            diffs,
            initialConfig,
            finalConfig,
            currentConfig: initialConfig.copy()
          }
        }
      }
    }

    case AutomatonType.Dfa: {
      const dfa = automaton as import('../../core/DFA').DFA
      const accepts = dfa.accepts(inputString)

      // TODO: Generate state sequence for step-through visualization

      return {
        accepts,
        navigation: {
          currentStep: 0,
          totalSteps: inputString.length,
          executionData: {
            type: 'dfa' as const,
            stateSequence: ['TODO'] // TODO: implement state sequence generation
          }
        }
      }
    }

    case AutomatonType.Nfa: {
      const nfa = automaton as import('../../core/NFA').NFA
      const accepts = nfa.accepts(inputString)

      // TODO: Generate state set sequence for step-through visualization

      return {
        accepts,
        navigation: {
          currentStep: 0,
          totalSteps: inputString.length,
          executionData: {
            type: 'nfa' as const,
            stateSetSequence: [['TODO']] // TODO: implement state set sequence generation
          }
        }
      }
    }

    case AutomatonType.Cfg: {
      const cfg = automaton as import('../../core/CFG').CFG
      const accepts = cfg.accepts(inputString)

      let outputString: string | undefined
      let parseTree = undefined

      if (accepts) {
        parseTree = cfg.parseTree(inputString)
        outputString = parseTree?.toTreeString()
      }

      return {
        accepts,
        outputString,
        navigation: {
          currentStep: 0,
          totalSteps: 1, // CFG doesn't have step-through, but we can show parse tree
          executionData: {
            type: 'cfg' as const,
            parseTree
          }
        }
      }
    }

    case AutomatonType.Regex: {
      const regex = automaton as import('../../core/Regex').Regex
      const accepts = regex.accepts(inputString)

      // Regex doesn't support step-through navigation
      return {
        accepts,
        // No navigation for Regex
      }
    }

    default:
      throw new Error(`Unknown automaton type: ${automatonType}`)
  }
}

// ========================================
// NAVIGATION FUNCTIONS
// ========================================

const navigateForward = (): void => {
  if (!appState.computation?.navigation) return

  const navigation = appState.computation.navigation
  const newStep = Math.min(navigation.currentStep + 1, navigation.totalSteps)

  if (newStep === navigation.currentStep) return // No change

  // Update currentStep
  setAppState('computation', 'navigation', 'currentStep', newStep)

  // Update TM currentConfig if applicable
  if (navigation.executionData?.type === 'tm') {
    updateTMCurrentConfig(newStep)
  }
}

const navigateBackward = (): void => {
  if (!appState.computation?.navigation) return

  const navigation = appState.computation.navigation
  const newStep = Math.max(navigation.currentStep - 1, 0)

  if (newStep === navigation.currentStep) return // No change

  // Update currentStep
  setAppState('computation', 'navigation', 'currentStep', newStep)

  // Update TM currentConfig if applicable
  if (navigation.executionData?.type === 'tm') {
    updateTMCurrentConfig(newStep)
  }
}

const navigateToBeginning = (): void => {
  if (!appState.computation?.navigation) return

  const navigation = appState.computation.navigation

  // Update currentStep to 0
  setAppState('computation', 'navigation', 'currentStep', 0)

  // Reset TM to initial config if applicable
  if (navigation.executionData?.type === 'tm') {
    const tmData = navigation.executionData
    const initialConfig = tmData.initialConfig as import('../../core/TM').TMConfiguration
    const updatedExecutionData = { ...tmData, currentConfig: initialConfig.copy() }
    setAppState('computation', 'navigation', 'executionData', updatedExecutionData)
  }
}

const navigateToEnd = (): void => {
  if (!appState.computation?.navigation) return

  const navigation = appState.computation.navigation

  // Update currentStep to totalSteps
  setAppState('computation', 'navigation', 'currentStep', navigation.totalSteps)

  // Set TM to final config if applicable
  if (navigation.executionData?.type === 'tm') {
    const tmData = navigation.executionData
    const finalConfig = tmData.finalConfig as import('../../core/TM').TMConfiguration
    const updatedExecutionData = { ...tmData, currentConfig: finalConfig.copy() }
    setAppState('computation', 'navigation', 'executionData', updatedExecutionData)
  }
}

// Helper function to update TM current configuration based on step
const updateTMCurrentConfig = (newStep: number): void => {
  if (!appState.computation?.navigation?.executionData || appState.computation.navigation.executionData.type !== 'tm') {
    return
  }

  const tmData = appState.computation.navigation.executionData
  const currentStep = appState.computation.navigation.currentStep
  const diffs = tmData.diffs as import('../../core/TM').ConfigDiff[]
  const currentConfig = tmData.currentConfig as import('../../core/TM').TMConfiguration

  if (newStep < currentStep) {
    // Move backward using reverse diffs
    for (let i = currentStep - 1; i >= newStep; i--) {
      const diff = diffs[i]
      currentConfig.applyReverseDiff(diff)
    }
  } else {
    // Move forward using diffs
    for (let i = currentStep; i < newStep; i++) {
      const diff = diffs[i]
      currentConfig.applyDiff(diff)
    }
  }

  // Update the current config in state
  const updatedExecutionData = { ...tmData, currentConfig }
  setAppState('computation', 'navigation', 'executionData', updatedExecutionData)
}

// ========================================
// REACTIVE EFFECTS (wrapped in createRoot to avoid warnings)
// ========================================

// Create a root context for module-level effects that should live for the app's lifetime
// We intentionally never call the dispose function since these should persist
createRoot(() => {

  // ========================================
  // LOCALSTORAGE PERSISTENCE
  // ========================================

  // Debounced save function to avoid excessive localStorage writes during typing
  const debouncedSave = debounce((state: Parameters<typeof saveToLocalStorage>[0]) => {
    saveToLocalStorage(state)
  }, 500) // Wait 500ms after last change before saving

  // Create effect to automatically save relevant state to localStorage
  createEffect(() => {
    // Automatically extract all persistable fields (excludes parseError and result)
    const stateToPersist = getPersistableState(appState)

    // Use debounced save to avoid saving on every keystroke
    debouncedSave(stateToPersist)
  })

  // ========================================
  // CENTRALIZED AUTOMATON PARSING 
  // ========================================

  // Create effect to parse automaton when editorContent or automatonType changes
  createEffect(() => {
    try {
      let automaton = undefined

      // Clear navigation controls when automaton type changes
      setAppState('navigationControls', undefined)

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
      setAppState('computation', undefined) // Clear results when parsing fails
    }
  })

  // ========================================
  // CENTRALIZED COMPUTATION (when runImmediately is enabled)
  // ========================================

  // Create effect to run computation when automaton, inputString, or runImmediately changes
  createEffect(() => {
    if (appState.automaton && appState.runImmediately) {

      try {
        // Run computation and build type-safe ExecutionData
        const computation = runUnifiedComputation(appState.automaton, appState.automatonType, appState.inputString)

        // Store computation result
        setAppState('computation', computation)
      } catch (error) {
        // Computation failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown computation error'
        setAppState('computation', { accepts: false, error: errorMessage })
      }
    }
  })

})


const runAutomatonTest = (): void => {
  // Complex logic: parse YAML, run automaton, update results
  try {
    // TODO: Parse YAML and test input
    const accepts = Math.random() > 0.5 // Placeholder
    const outputString = Math.random() > 0.7 ? 'sample output' : undefined // Placeholder for TM output
    setAppState('computation', {
      accepts,
      outputString,
      error: undefined
    })
    setAppState('parseError', undefined)
  } catch (error) {
    setAppState('computation', { accepts: false, error: String(error) })
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
          setAppState('computation', undefined)
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