/**
 * Application state types for SolidJS Elm Architecture implementation
 */

import type { Automaton } from '../../core/Automaton'

// Discriminated union for step-through execution data
export type ExecutionData = 
  | { type: 'dfa'; stateSequence: string[] }
  | { type: 'nfa'; stateSetSequence: string[][] }  
  | { type: 'tm'; diffs: unknown[]; initialConfig: unknown; finalConfig: unknown; currentConfig: unknown }
  | { type: 'cfg'; parseTree?: unknown }

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
  
  // Parsed automaton (undefined if parsing failed)
  automaton?: Automaton
  
  // Results
  parseError?: string
  
  // Unified computation results (replaces old 'result' field)
  computation?: {
    // Common results (all automaton types)
    accepts: boolean
    outputString?: string
    error?: string
    
    // Navigation state (when step-through visualization is available)
    navigation?: {
      currentStep: number
      totalSteps: number
      
      // Type-safe execution data using discriminated unions
      executionData?: ExecutionData
    }
  }
}

// We'll set the actual default content in AppStore.ts where we have access to getDefaultYamlFor
export const initialState: AppState = {
  automatonType: AutomatonType.Dfa,
  theme: 'monokai',
  splitPercentage: 0.5,
  runImmediately: true,
  inputString: '',
  editorContent: '',
}