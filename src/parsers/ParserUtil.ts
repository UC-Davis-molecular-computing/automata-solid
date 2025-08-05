import { LineCounter } from 'yaml'
import type { ErrorObject } from 'ajv'
import { setNotation } from '../core/Utils'

/**
 * Interface for source position information
 */
export interface SourcePosition {
  line: number  // 1-indexed line number
  col: number   // 1-indexed column number
  offset: number
}

/**
 * Interface for formatted error with original YAML source reference
 */
export interface FormattedError {
  message: string
  path: string
  position?: SourcePosition
  contextLines?: string[]
}

/**
 * CodeMirror diagnostic interface (imported type for convenience)
 */
export interface Diagnostic {
  from: number
  to: number
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  source?: string
  markClass?: string
}

/**
 * Utility functions for YAML parser error formatting
 */
export class ParserUtil {
  
  /**
   * Format YAML syntax error with original source context and correct positioning
   */
  static formatYamlSyntaxError(yamlString: string, message: string, position?: SourcePosition): string {
    if (!position) {
      return `YAML syntax error:\n${message}`
    }

    const lines = yamlString.split('\n')
    const contextLines = ParserUtil.getContextLines(lines, position.line, 1, 1) // 1 before, 1 after
    
    let result = `YAML syntax error:\n${message}\n\n`
    
    contextLines.forEach((contextLine) => {
      const { content, isErrorLine, lineNumber } = contextLine
      const prefix = isErrorLine ? '>' : ' '
      const lineNumStr = String(lineNumber).padStart(3)
      
      result += `${prefix}${lineNumStr} | ${content}\n`
      
      if (isErrorLine) {
        // Calculate pointer position: prefix (1) + line number (3) + ' | ' (3) = 7 chars before content
        // Then add the column position (1-indexed, so col-1 for 0-indexed)
        const prefixLength = 7 // ' 123 | '.length
        const pointer = ' '.repeat(prefixLength + position.col - 1) + '^'
        result += `${pointer}\n`
      }
    })
    
    return result.trim()
  }

  /**
   * Format validation errors with original YAML source positions
   */
  static formatValidationErrors(
    yamlString: string, 
    doc: any, 
    errors: ErrorObject[], 
    lineCounter: LineCounter
  ): FormattedError[] {
    const lines = yamlString.split('\n')
    
    return errors.map(error => {
      // Special handling for ajv-errors wrapped errors
      let instancePathToUse = error.instancePath
      let pointToKey = false
      
      if (error.keyword === 'errorMessage' && error.params?.errors?.[0]) {
        const nestedError = error.params.errors[0]
        
        // Handle additionalProperties errors
        if (nestedError.keyword === 'additionalProperties') {
          const additionalProperty = nestedError.params?.additionalProperty
          if (additionalProperty) {
            // Build the full path: parent instancePath + additionalProperty
            const basePath = nestedError.instancePath || ''
            instancePathToUse = basePath + '/' + additionalProperty
            pointToKey = true
            
            // Also improve the error message for different additionalProperties contexts
            if (basePath === '/delta') {
              // Extract the setNotation part from the original message
              const statesMatch = error.message?.match(/\{[^}]*\}/)
              const statesNotation = statesMatch ? statesMatch[0] : '{allowed states}'
              error.message = `Transition from unknown state "${additionalProperty}" - must be one of the defined states: ${statesNotation}`
            } else if (basePath.startsWith('/delta/')) {
              // Unknown symbol in state transitions like /delta/q0/2
              const stateMatch = basePath.match(/\/delta\/([^\/]+)/)
              const stateName = stateMatch ? stateMatch[1] : 'state'
              // Extract the setNotation part from the original message
              const symbolsMatch = error.message?.match(/\{[^}]*\}/)
              const symbolsNotation = symbolsMatch ? symbolsMatch[0] : '{allowed symbols}'
              error.message = `Transition with unknown symbol "${additionalProperty}" from state "${stateName}" - must be one of the defined input symbols: ${symbolsNotation}`
            } else if (basePath === '') {
              // Root level unexpected property
              error.message = `Unexpected property "${additionalProperty}" - DFA specifications only allow: states, input_alphabet, start_state, accept_states, delta`
            }
          }
        }
        
        // Handle uniqueItems errors - point to the duplicate item
        else if (nestedError.keyword === 'uniqueItems' && nestedError.params?.j !== undefined) {
          // Point to the second occurrence of the duplicate (index j)
          const duplicateIndex = nestedError.params.j
          instancePathToUse = nestedError.instancePath + '/' + duplicateIndex
        }
      }
      
      const position = ParserUtil.findErrorPosition(doc, instancePathToUse, lineCounter, pointToKey)
      const customMessage = ParserUtil.getCustomErrorMessage(error)
      
      let message = customMessage || error.message || 'Unknown error'
      
      if (position) {
        const contextLines = ParserUtil.getContextLines(lines, position.line, 2, 1) // 2 before, 1 after
        
        message += `\n\n`
        contextLines.forEach((contextLine) => {
          const { content, isErrorLine, lineNumber } = contextLine
          const prefix = isErrorLine ? '>' : ' '
          const lineNumStr = String(lineNumber).padStart(3)
          
          message += `${prefix}${lineNumStr} | ${content}\n`
          
          if (isErrorLine) {
            const prefixLength = 7 // ' 123 | '.length
            const pointer = ' '.repeat(prefixLength + position.col - 1) + '^'
            const hint = ParserUtil.getErrorHint(error)
            message += `${pointer} 👈 ${hint}\n`
          }
        })
      }
      
      return {
        message: message.trim(),
        path: error.instancePath || 'root',
        position
      }
    })
  }

  /**
   * Get context lines around an error position with proper line numbering
   */
  static getContextLines(
    lines: string[], 
    errorLine: number, // 1-indexed line number
    contextBefore: number = 2, 
    contextAfter: number = 1
  ): Array<{line: string, content: string, isErrorLine: boolean, lineNumber: number}> {
    const errorLineIndex = errorLine - 1 // Convert to 0-indexed
    const startIndex = Math.max(0, errorLineIndex - contextBefore)
    const endIndex = Math.min(lines.length, errorLineIndex + contextAfter + 1)
    
    const result = []
    for (let i = startIndex; i < endIndex; i++) {
      result.push({
        line: lines[i],
        content: lines[i],
        isErrorLine: i === errorLineIndex,
        lineNumber: i + 1 // Convert back to 1-indexed for display
      })
    }
    
    return result
  }

  /**
   * Find the position of an error in the original YAML source using CST
   */
  static findErrorPosition(doc: any, instancePath: string, lineCounter: LineCounter, pointToKey: boolean = false): SourcePosition | undefined {
    if (!doc.contents) return undefined

    try {
      const pathSegments = instancePath.split('/').filter(Boolean)
      let currentNode = doc.contents

      // Handle empty path (root level errors)
      if (pathSegments.length === 0) {
        if (currentNode && currentNode.range) {
          const offset = currentNode.range[0]
          const { line, col } = lineCounter.linePos(offset)
          return { line, col, offset }
        }
        return undefined
      }

      // Navigate through the document structure
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        
        if (ParserUtil.isMap(currentNode)) {
          // Find the pair with the matching key
          const pair = currentNode.items.find((item: any) => 
            item.key && ParserUtil.isScalar(item.key) && String(item.key.value) === segment
          )
          if (pair) {
            // For the final segment of additionalProperties errors, point to the key
            // For all other cases (including intermediate segments), point to the value
            const isLastSegment = i === pathSegments.length - 1
            const useKey = pointToKey && isLastSegment
            currentNode = useKey ? pair.key : (pair.value || pair.key)
          } else {
            return undefined
          }
        } else if (ParserUtil.isSeq(currentNode)) {
          const index = parseInt(segment, 10)
          if (!isNaN(index) && index < currentNode.items.length) {
            currentNode = currentNode.items[index]
          } else {
            return undefined
          }
        } else {
          return undefined
        }
      }

      // Get the position from the CST node
      if (currentNode && currentNode.range) {
        const offset = currentNode.range[0]
        const { line, col } = lineCounter.linePos(offset)
        return { line, col, offset }
      }
    } catch (error) {
      // Fallback: return undefined if position cannot be determined
      return undefined
    }

    return undefined
  }

  /**
   * Get custom error message from ajv-errors or map common validation errors
   */
  static getCustomErrorMessage(error: ErrorObject): string | undefined {
    // Handle ajv-errors wrapped errors
    if (error.keyword === 'errorMessage' && error.params?.errors) {
      const nestedError = error.params.errors[0]
      
      // Check if this is a wrapped required error
      if (nestedError && nestedError.keyword === 'required') {
        const missingField = nestedError.params?.missingProperty
        if (missingField) {
          return `Missing required field "${missingField}" - automaton specifications must have: states, input_alphabet, start_state, accept_states, delta`
        }
      }
      
      // Check if this is a wrapped enum error for start_state array case
      if (nestedError && nestedError.keyword === 'enum' && 
          nestedError.instancePath === '/start_state' && 
          nestedError.data && typeof nestedError.data === 'string' && 
          nestedError.data.includes(',')) {
        return `Start state must be a single state name, not an array (make sure this is an individual state, not a list of states)`
      }
      
      // Check if this is a wrapped uniqueItems error
      if (nestedError && nestedError.keyword === 'uniqueItems') {
        if (nestedError.params?.i !== undefined && nestedError.params?.j !== undefined && Array.isArray(nestedError.data)) {
          const duplicateValue = nestedError.data[nestedError.params.i]
          return `Duplicate value \`${duplicateValue}\` found (no duplicates allowed)`
        }
        return 'Values must be unique (no duplicates allowed)'
      }
      
      // Check if this is a wrapped enum error for transitions
      if (nestedError && nestedError.keyword === 'enum' && nestedError.data) {
        const invalidValue = nestedError.data
        // Use allowedValues from params if available (for $data references), otherwise schema
        const allowedValues = nestedError.params?.allowedValues || nestedError.schema || []
        
        // Handle $data references that can't be resolved due to invalid structure
        if (allowedValues && typeof allowedValues === 'object' && allowedValues.$data) {
          return `Invalid value "${invalidValue}" - value not allowed`
        }
        
        // Use setNotation for consistent formatting - ensure it's an array
        const formattedValues = setNotation(Array.isArray(allowedValues) ? allowedValues : [allowedValues])
        
        // Check if this looks like a transition error based on the instance path
        if (nestedError.instancePath.includes('/delta/')) {
          return `Transition to unknown state "${invalidValue}" - must be one of the defined states: ${formattedValues}`
        }
        return `Invalid value "${invalidValue}" - must be one of: ${formattedValues}`
      }
      
      // Check if this is a wrapped maxLength error
      if (nestedError && nestedError.keyword === 'maxLength' && nestedError.data) {
        const invalidValue = nestedError.data
        const maxLength = nestedError.schema
        return `Symbol "${invalidValue}" is too long (${invalidValue.length} characters) - symbols must be exactly ${maxLength} character${maxLength === 1 ? '' : 's'}`
      }
      
      // Check if this is a wrapped minLength error  
      if (nestedError && nestedError.keyword === 'minLength') {
        const invalidValue = nestedError.data
        const minLength = nestedError.schema
        // Special case for empty strings in input alphabet
        if (nestedError.instancePath.includes('/input_alphabet/') && invalidValue === '') {
          return `Each input symbol must be exactly one character, but '' has 0 characters`
        }
        return `Value "${invalidValue}" is too short (${invalidValue.length} characters) - must be at least ${minLength} character${minLength === 1 ? '' : 's'}`
      }
      
      
      // For other ajv-errors, use the provided message
      return error.message
    }
    
    // Map some common validation errors to custom messages
    switch (error.keyword) {
      case 'required':
        const missingField = error.params?.missingProperty
        if (missingField) {
          return `Missing required field "${missingField}" - automaton specifications must have: states, input_alphabet, start_state, accept_states, delta`
        }
        return `Missing required field - automaton specifications must have: states, input_alphabet, start_state, accept_states, delta`
      case 'minItems':
        return 'DFA must have at least one state'
      case 'maxLength':
        return 'Each input symbol must be exactly one character'
      case 'uniqueItems':
        // Try to get the duplicate value name from params
        if (error.params?.i !== undefined && error.params?.j !== undefined && Array.isArray(error.data)) {
          const duplicateValue = error.data[error.params.i]
          return `Duplicate value "${duplicateValue}" found (no duplicates allowed)`
        }
        return 'Values must be unique (no duplicates allowed)'
      case 'enum':
        // Special case: detect when start_state was provided as an array
        if (error.instancePath === '/start_state' && error.data && typeof error.data === 'string' && error.data.includes(',')) {
          return `Start state must be a single state name, not an array (make sure this is an individual state, not a list of states)`
        }
        return `Value must be one of the allowed values: ${JSON.stringify(error.params?.allowedValues || [])}`
      case 'type':
        const expectedType = error.params?.type || 'the correct type'
        const actualValue = error.data
        if (actualValue !== undefined) {
          const actualValueStr = typeof actualValue === 'string' ? `"${actualValue}"` : String(actualValue)
          return `must be ${expectedType}, but found ${actualValueStr}`
        }
        return `must be ${expectedType}`
      case 'additionalProperties':
        return 'Unexpected property - only allowed properties are: states, input_alphabet, start_state, accept_states, delta'
      default:
        return error.message
    }
  }

  /**
   * Get helpful hint for error context
   */
  static getErrorHint(error: ErrorObject): string {
    switch (error.keyword) {
      case 'required':
        const field = error.params?.missingProperty
        return `${field} is missing here!`
      case 'minItems':
        return 'Array cannot be empty'
      case 'maxLength':
        return 'Symbol too long'
      case 'uniqueItems':
        return 'Duplicate found'
      case 'enum':
        return 'Invalid value'
      case 'type':
        return `Expected ${error.params?.type}`
      case 'additionalProperties':
        return 'Unexpected property'
      default:
        return 'Error here'
    }
  }

  // Helper type guards for YAML nodes (since we can't import from yaml easily)
  private static isMap(node: any): boolean {
    return node && typeof node === 'object' && node.items && Array.isArray(node.items) && 
           (node.type === 'MAP' || node.type === 'FLOW_MAP' || (!node.type && ParserUtil.hasMapStructure(node)))
  }

  private static isSeq(node: any): boolean {
    return node && typeof node === 'object' && node.items && Array.isArray(node.items) && 
           (node.type === 'SEQ' || node.type === 'FLOW_SEQ' || (!node.type && ParserUtil.hasSeqStructure(node)))
  }

  private static isScalar(node: any): boolean {
    return node && typeof node === 'object' && 
           (node.value !== undefined || node.type === 'PLAIN' || node.type === 'QUOTE_DOUBLE' || 
            node.type === 'QUOTE_SINGLE' || node.type === 'BLOCK_LITERAL' || node.type === 'BLOCK_FOLDED')
  }

  // Helper to distinguish map vs sequence structure when type is missing
  private static hasMapStructure(node: any): boolean {
    return node.items && node.items.length > 0 && 
           node.items.some((item: any) => item.key !== undefined)
  }

  private static hasSeqStructure(node: any): boolean {
    return node.items && node.items.length > 0 && 
           node.items.every((item: any) => item.key === undefined)
  }

  /**
   * Normalize YAML-parsed data to handle numbers as strings
   */
  static normalizeSpec(parsed: unknown): unknown {
    if (!parsed || typeof parsed !== 'object') {
      return parsed
    }

    const obj = parsed as Record<string, unknown>
    const normalized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      if (key === 'input_alphabet' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'states' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'start_state') {
        if (Array.isArray(value)) {
          // User provided an array instead of a single state
          // Convert it for validation, but we'll detect this error in custom messages
          normalized[key] = String(value)  // This becomes "q0,q1" without brackets
        } else {
          normalized[key] = String(value)
        }
      } else if (key === 'accept_states' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'delta' && value && typeof value === 'object') {
        const delta = value as Record<string, unknown>
        const normalizedDelta: Record<string, Record<string, string>> = {}
        
        for (const [fromState, stateDelta] of Object.entries(delta)) {
          const fromStateStr = String(fromState)
          normalizedDelta[fromStateStr] = {}
          
          if (stateDelta && typeof stateDelta === 'object') {
            for (const [symbol, toState] of Object.entries(stateDelta)) {
              const symbolStr = String(symbol)
              const toStateStr = String(toState)
              normalizedDelta[fromStateStr][symbolStr] = toStateStr
            }
          }
        }
        normalized[key] = normalizedDelta
      } else {
        normalized[key] = value
      }
    }

    return normalized
  }

  /**
   * Normalize YAML-parsed data for NFA specifications
   */
  static normalizeNFASpec(parsed: unknown): unknown {
    if (!parsed || typeof parsed !== 'object') {
      return parsed
    }

    const obj = parsed as Record<string, unknown>
    const normalized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      if (key === 'input_alphabet' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'states' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'start_state') {
        if (Array.isArray(value)) {
          // User provided an array instead of a single state
          // Convert it for validation, but we'll detect this error in custom messages
          normalized[key] = String(value)  // This becomes "q0,q1" without brackets
        } else {
          normalized[key] = String(value)
        }
      } else if (key === 'accept_states' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'delta' && value && typeof value === 'object') {
        const delta = value as Record<string, unknown>
        const normalizedDelta: Record<string, Record<string, string[]>> = {}
        
        for (const [fromState, stateDelta] of Object.entries(delta)) {
          const fromStateStr = String(fromState)
          normalizedDelta[fromStateStr] = {}
          
          if (stateDelta && typeof stateDelta === 'object') {
            const stateTransitions = stateDelta as Record<string, unknown>
            for (const [symbol, targets] of Object.entries(stateTransitions)) {
              const symbolStr = String(symbol)
              if (Array.isArray(targets)) {
                normalizedDelta[fromStateStr][symbolStr] = targets.map(target => String(target))
              } else {
                // Single target converted to array (DFA syntax is valid in NFA)
                normalizedDelta[fromStateStr][symbolStr] = [String(targets)]
              }
            }
          }
        }
        normalized[key] = normalizedDelta
      } else {
        normalized[key] = value
      }
    }

    return normalized
  }

  /**
   * Normalize YAML-parsed data for TM specifications
   */
  static normalizeTMSpec(parsed: unknown): unknown {
    if (!parsed || typeof parsed !== 'object') {
      return parsed
    }

    const obj = parsed as Record<string, unknown>
    const normalized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      if (key === 'input_alphabet' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'tape_alphabet_extra' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'states' && Array.isArray(value)) {
        normalized[key] = value.map(item => String(item))
      } else if (key === 'start_state' || key === 'accept_state' || key === 'reject_state') {
        if (Array.isArray(value)) {
          // User provided an array instead of a single state
          normalized[key] = String(value)  // This becomes "q0,q1" without brackets
        } else {
          normalized[key] = String(value)
        }
      } else if (key === 'delta' && value && typeof value === 'object') {
        const delta = value as Record<string, unknown>
        const normalizedDelta: Record<string, Record<string, string[]>> = {}
        
        for (const [fromState, stateDelta] of Object.entries(delta)) {
          const fromStateStr = String(fromState)
          normalizedDelta[fromStateStr] = {}
          
          if (stateDelta && typeof stateDelta === 'object') {
            const stateTransitions = stateDelta as Record<string, unknown>
            for (const [symbols, transition] of Object.entries(stateTransitions)) {
              const symbolsStr = String(symbols)
              if (Array.isArray(transition)) {
                // TM transition: [next_state, write_symbols, direction]
                normalizedDelta[fromStateStr][symbolsStr] = transition.map(item => String(item))
              } else {
                // Single value - shouldn't happen in TM but handle gracefully
                normalizedDelta[fromStateStr][symbolsStr] = [String(transition)]
              }
            }
          }
        }
        normalized[key] = normalizedDelta
      } else {
        normalized[key] = value
      }
    }

    return normalized
  }

  /**
   * Convert FormattedError objects to CodeMirror Diagnostic objects
   * This allows the editor to display inline error highlighting
   */
  static convertToDiagnostics(
    yamlString: string,
    formattedErrors: FormattedError[]
  ): Diagnostic[] {
    return formattedErrors.map(error => {
      if (!error.position) {
        // No position info - highlight first non-whitespace content
        const firstNonWhitespace = yamlString.search(/\S/)
        return {
          from: firstNonWhitespace >= 0 ? firstNonWhitespace : 0,
          to: Math.min(yamlString.length, firstNonWhitespace + 50),
          severity: 'error' as const,
          message: error.message,
          source: 'automata-parser'
        }
      }

      const { line, col, offset } = error.position
      const lines = yamlString.split('\n')
      
      // Use the offset directly if available and valid
      let from = offset
      let to = offset + 1 // Default to single character
      
      // Try to find a more appropriate end position
      if (line - 1 < lines.length) {
        const lineContent = lines[line - 1]
        const restOfLine = lineContent.substring(col - 1)
        
        // Match different token types
        const tokenMatch = restOfLine.match(/^([^\s:,\[\]{}]+|[:\[\]{}])/)
        if (tokenMatch) {
          to = from + tokenMatch[0].length
        } else {
          // If we can't find a token, highlight until next whitespace or punctuation
          const endMatch = restOfLine.match(/^[^\s:,\[\]{}]*/)
          if (endMatch && endMatch[0].length > 0) {
            to = from + endMatch[0].length
          }
        }
      }
      
      return {
        from: Math.max(0, Math.min(from, yamlString.length)),
        to: Math.max(from + 1, Math.min(to, yamlString.length)),
        severity: 'error' as const,
        message: error.message,
        source: 'automata-parser',
        markClass: 'cm-automata-error'
      }
    })
  }

}