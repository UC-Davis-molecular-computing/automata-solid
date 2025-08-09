import type { AppState } from '../types/AppState'

// Keys for localStorage
const STORAGE_KEYS = {
  APP_STATE: 'automata-app-state',
  APP_VERSION: 'automata-app-version'
} as const

// Current version for migration purposes
const CURRENT_VERSION = '1.0.0'

// Fields that should NOT be persisted (everything else is automatically saved)
// automaton is excluded because: 1) it can be reconstructed from editorContent, 2) some automatons have circular references
type TransientFields = 'parseError' | 'result' | 'automaton'

// Automatically computed: all AppState fields except transient ones
export type PersistableState = Omit<AppState, TransientFields>

// Helper function to extract only persistable fields from AppState
export function getPersistableState(state: AppState): PersistableState {
  // Destructure and rename to underscore prefix to avoid linter "unused variable" errors
  // We need to use the exact property names for destructuring, but don't need the values
  const { parseError: _parseError, result: _result, automaton: _automaton, ...persistable } = state
  return persistable
}

// Simple helper to filter out transient fields from stored data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getValidStoredFields(stored: any): Partial<PersistableState> {
  if (!stored || typeof stored !== 'object') {
    return {}
  }
  
  // Remove transient fields - everything else is automatically included
  // Destructure and rename to underscore prefix to avoid linter "unused variable" errors
  const { parseError: _parseError, result: _result, automaton: _automaton, version: _version, timestamp: _timestamp, ...validFields } = stored
  
  // Basic type safety for critical fields only
  if ('splitPercentage' in validFields) {
    const split = validFields.splitPercentage
    if (typeof split !== 'number' || split <= 0 || split >= 1) {
      delete validFields.splitPercentage
    }
  }
  
  return validFields
}

/**
 * Save state to localStorage with error handling
 */
export function saveToLocalStorage(state: PersistableState): void {
  try {
    const dataToSave = {
      ...state,
      version: CURRENT_VERSION,
      timestamp: Date.now()
    }
    
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(dataToSave))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
    // In case localStorage is full or disabled, we'll just continue without saving
  }
}

/**
 * Load state from localStorage with error handling and validation
 */
export function loadFromLocalStorage(): Partial<PersistableState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.APP_STATE)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    
    // Basic validation
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }
    
    // Version check (for future migrations)
    if (parsed.version && parsed.version !== CURRENT_VERSION) {
      // For now, we'll still use the data, but in the future we could migrate here
    }
    
    // Automatically restore all valid fields (excludes transients and invalid data)
    const validState = getValidStoredFields(parsed)
    
    return validState
    
  } catch (error) {
    console.warn('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * Clear localStorage (useful for debugging or user reset)
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.APP_STATE)
  } catch (error) {
    console.warn('Failed to clear localStorage:', error)
  }
}