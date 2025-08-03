/**
 * Utility functions shared across different automaton types (DFA, NFA, TM, etc.)
 */

/**
 * Format an array of items as set notation string
 * @param items Array of strings to format
 * @returns String in set notation like "{q0,q1,q2}"
 */
export function setNotation(items: string[]): string {
  if (!Array.isArray(items)) {
    return `{${String(items)}}`
  }
  const formattedItems = items.map(item => {
    const str = String(item)
    return str === '' ? "''" : str
  })
  return `{${formattedItems.join(',')}}`
}

/**
 * Validate that all characters in input string are in the input alphabet
 * @param inputAlphabet Valid input symbols
 * @param x Input string to validate
 * @throws Error if any character is not in alphabet
 */
export function checkAgainstInputAlphabet(inputAlphabet: string[], x: string): void {
  for (let i = 0; i < x.length; i++) {
    const ch = x[i]
    if (!inputAlphabet.includes(ch)) {
      throw new Error(`symbol '${ch}' not contained in alphabet ${setNotation(inputAlphabet)}`)
    }
  }
}

/**
 * Create a flattened key for delta function lookups
 * @param state Source state
 * @param symbol Input symbol
 * @returns Flattened key string "state,symbol"
 */
export function deltaKey(state: string, symbol: string): string {
  return `${state},${symbol}`
}

// ============================================================================
// Wildcard Utilities for Turing Machines
// ============================================================================

/**
 * Wildcard symbol for TM transitions - matches any single character
 */
export const WILDCARD = '?'

/**
 * Check if input string matches pattern with wildcards
 * @param input Concrete input string (no wildcards)
 * @param pattern Pattern string (may contain wildcards)
 * @returns True if input matches pattern
 */
export function wildcardMatch(input: string, pattern: string): boolean {
  if (input.length !== pattern.length) {
    return false
  }
  
  for (let i = 0; i < input.length; i++) {
    if (pattern[i] !== WILDCARD && input[i] !== pattern[i]) {
      return false
    }
  }
  
  return true
}

/**
 * Apply wildcard masking to output - replace ? with corresponding input symbols
 * @param input Input symbols that matched the wildcard pattern
 * @param outputPattern Output pattern (may contain wildcards)
 * @returns Output with wildcards replaced by input symbols
 */
export function wildcardMaskedOutput(input: string, outputPattern: string): string {
  if (input.length !== outputPattern.length) {
    throw new Error(`Input and output pattern must have same length: input "${input}" vs pattern "${outputPattern}"`)
  }
  
  let result = ''
  for (let i = 0; i < input.length; i++) {
    if (outputPattern[i] === WILDCARD) {
      result += input[i]
    } else {
      result += outputPattern[i]
    }
  }
  
  return result
}

/**
 * Find all concrete strings that match both wildcard patterns
 * @param pattern1 First wildcard pattern
 * @param pattern2 Second wildcard pattern  
 * @param alphabet Alphabet to generate concrete strings from
 * @returns Array of strings that match both patterns
 */
export function wildcardIntersect(pattern1: string, pattern2: string, alphabet: string[]): string[] {
  if (pattern1.length !== pattern2.length) {
    return []
  }
  
  if (pattern1.length === 0) {
    return ['']
  }
  
  // Recursive case: process first character and recurse
  const len = pattern1.length - 1
  const restIntersection = wildcardIntersect(
    pattern1.substring(0, len),
    pattern2.substring(0, len),
    alphabet
  )
  
  const char1 = pattern1[len]
  const char2 = pattern2[len]
  const result: string[] = []
  
  if (char1 === WILDCARD && char2 === WILDCARD) {
    // Both wildcards - try all alphabet symbols
    for (const prefix of restIntersection) {
      for (const symbol of alphabet) {
        result.push(prefix + symbol)
      }
    }
  } else if (char1 !== WILDCARD && char2 !== WILDCARD) {
    // Both concrete
    if (char1 === char2) {
      // Same concrete symbol
      for (const prefix of restIntersection) {
        result.push(prefix + char1)
      }
    }
    // Different concrete symbols - no intersection
  } else {
    // One wildcard, one concrete - use the concrete symbol
    const concreteChar = char1 === WILDCARD ? char2 : char1
    for (const prefix of restIntersection) {
      result.push(prefix + concreteChar)
    }
  }
  
  return result
}