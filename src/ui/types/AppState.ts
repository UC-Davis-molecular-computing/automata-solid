/**
 * Application state types for SolidJS Elm Architecture implementation
 */

export const AutomatonType = {
  Dfa: 'dfa',
  Nfa: 'nfa', 
  Regex: 'regex',
  Cfg: 'cfg',
  Tm: 'tm'
} as const

export type AutomatonType = typeof AutomatonType[keyof typeof AutomatonType]

// Message types moved to Messages.ts for DRY principle

export interface AppState {
  // Current automaton type
  automatonType: AutomatonType
  
  // UI state
  theme: string
  splitPercentage: number
  runImmediately: boolean
  
  // Input and test state
  inputString: string
  editorContent: string
  
  // Results
  parseError: string | null
  result: {
    accepts: boolean
    outputString?: string | null
    error?: string
  } | null
}

// We'll set the actual default content in AppStore.ts where we have access to getDefaultYamlFor
export const initialState: AppState = {
  automatonType: AutomatonType.Dfa,
  theme: 'monokai',
  splitPercentage: 0.5,
  runImmediately: true,
  inputString: '',
  editorContent: '',
  parseError: null,
  result: null
}