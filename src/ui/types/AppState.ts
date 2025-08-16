/**
 * Application state types for SolidJS Elm Architecture implementation
 */

import type { Automaton } from '../../core/Automaton'
import { ParserUtil } from '../../parsers/ParserUtil'
import type { NavigationControls } from './NavigationControls'
import type { TMConfiguration, ConfigDiff } from '../../core/TM'
import type { TreeNode } from '../../core/CFG'

// Discriminated union for step-through execution data
export type ExecutionData =
  | { type: 'dfa'; statesVisited: string[] }
  | { type: 'nfa'; stateSetsVisited: string[][] }
  | { type: 'tm'; diffs: ConfigDiff[]; initialConfig: TMConfiguration; finalConfig: TMConfiguration; currentConfig: TMConfiguration }
  | { type: 'cfg'; parseTree?: TreeNode }

export const AutomatonType = {
  Dfa: 'dfa',
  Nfa: 'nfa',
  Regex: 'regex',
  Cfg: 'cfg',
  Tm: 'tm'
} as const

export type AutomatonType = typeof AutomatonType[keyof typeof AutomatonType]

export const ViewMode = {
  Table: 'table',
  Graph: 'graph'
} as const

export type ViewMode = typeof ViewMode[keyof typeof ViewMode]

// Message types moved to Messages.ts for DRY principle

export interface AppState {
  // Current automaton type
  automatonType: AutomatonType

  // UI state
  theme: string
  viewMode: ViewMode
  splitPercentage: number
  runImmediately: boolean

  // Input and test state
  inputString: string
  editorContent: string

  // Parsed automaton (undefined if parsing failed)
  automaton?: Automaton

  // Navigation controls registered by components
  navigationControls?: NavigationControls

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

// Default initial state - use a getter function to avoid initialization-time execution
export const getDefaultInitialState = (): AppState => ({
  automatonType: AutomatonType.Dfa,
  theme: 'monokai',
  viewMode: ViewMode.Table,
  splitPercentage: 0.5,
  runImmediately: true,
  inputString: '',
  editorContent: ParserUtil.getDefaultContent(AutomatonType.Dfa),
})