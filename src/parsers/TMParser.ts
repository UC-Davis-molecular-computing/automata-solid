import { parseDocument, LineCounter } from 'yaml'
import Ajv, { type ValidateFunction } from 'ajv'
import addErrors from 'ajv-errors'
import { TM } from '../core/TM'
import { setNotation } from '../core/Utils'
import { ParserUtil } from './ParserUtil'
import tmBaseSchema from './tm-base-schema.json'

/**
 * Interface representing the YAML structure for TM specifications
 */
export interface TMSpec {
  states: string[]
  input_alphabet: string[]
  tape_alphabet_extra: string[]
  start_state: string
  accept_state: string
  reject_state: string
  delta: Record<string, Record<string, string[]>>
}

/**
 * Enhanced TM Parser that maps validation errors back to original YAML source
 * Uses yaml package's CST and LineCounter for precise source position tracking
 */
export class TMParser {
  private ajv: Ajv
  private baseValidate: ValidateFunction

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      $data: true,  // Enable $data references in schema
      verbose: true // Enable verbose mode for better error details
    })
    
    // Add ajv-errors plugin for custom error messages
    addErrors(this.ajv)
    
    // Compile base schema for first pass validation
    this.baseValidate = this.ajv.compile(tmBaseSchema)
  }

  /**
   * Parse YAML string into a TM instance with original source error mapping
   * @param yamlString - YAML specification of the TM
   * @returns TM instance
   * @throws Error with precise YAML source positioning
   */
  parseTM(yamlString: string): TM {
    // Create LineCounter for position tracking
    const lineCounter = new LineCounter()
    
    // Parse YAML using the yaml package with CST preservation
    const doc = parseDocument(yamlString, { 
      lineCounter,
      keepSourceTokens: true // Keep source tokens for position mapping
    })
    
    // Check for YAML syntax errors
    if (doc.errors.length > 0) {
      const firstError = doc.errors[0]
      const position = firstError.linePos ? 
        { line: firstError.linePos[0].line, col: firstError.linePos[1]?.col || 0, offset: firstError.pos?.[0] || 0 } : 
        undefined
      
      const formattedError = ParserUtil.formatYamlSyntaxError(yamlString, firstError.message, position)
      throw new Error(formattedError)
    }
    
    // Convert document to JavaScript object
    const parsed = doc.toJS()

    // Normalize the parsed data to handle numbers as strings
    const normalizedSpec = ParserUtil.normalizeTMSpec(parsed)

    // PASS 1: Base structure validation (states, input_alphabet, start_state, accept_states)
    if (!this.baseValidate(normalizedSpec)) {
      const errors = this.baseValidate.errors || []
      const formattedErrors = ParserUtil.formatValidationErrors(yamlString, doc, errors, lineCounter)
      throw new Error(formattedErrors.map(e => e.message).join('\n\n'))
    }

    const spec = normalizedSpec as TMSpec

    // PASS 2: Build complete tape alphabet and validate
    const tapeAlphabetExtraSet = new Set(spec.tape_alphabet_extra)
    if (!tapeAlphabetExtraSet.has('_')) {
      tapeAlphabetExtraSet.add('_')
    }
    const finalTapeAlphabetExtra = Array.from(tapeAlphabetExtraSet)
    const tapeAlphabet = [...spec.input_alphabet, ...finalTapeAlphabetExtra]
    
    // Check for overlaps between input_alphabet and tape_alphabet_extra
    const inputSet = new Set(spec.input_alphabet)
    const extraSet = new Set(finalTapeAlphabetExtra)
    const intersection = new Set([...inputSet].filter(x => extraSet.has(x)))
    if (intersection.size > 0) {
      throw new Error(`Input alphabet and tape alphabet extra cannot overlap. Found overlapping symbols: ${setNotation(Array.from(intersection))}`)
    }

    // PASS 3: Dynamic delta validation with precise error positioning
    this.validateDelta(spec, tapeAlphabet, yamlString, doc, lineCounter)

    try {
      return new TM(
        spec.states,
        spec.input_alphabet,
        tapeAlphabet,
        spec.start_state,
        spec.accept_state,
        spec.reject_state,
        spec.delta
      )
    } catch (error) {
      throw new Error(`TM construction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * PASS 3: Validate delta structure using dynamically generated schema
   * This provides precise error positioning for individual delta properties
   */
  private validateDelta(spec: TMSpec, tapeAlphabet: string[], originalYaml: string, doc: any, lineCounter: LineCounter): void {
    // Determine number of tapes from first transition (simplified)
    const firstState = Object.keys(spec.delta)[0]
    const firstSymbols = firstState ? Object.keys(spec.delta[firstState])[0] : undefined
    if (!firstSymbols) {
      throw new Error('Delta must contain at least one transition')
    }
    const numTapes = firstSymbols.length

    // Build dynamic schema for delta validation
    const deltaSchema = this.buildDeltaSchema(spec.states, tapeAlphabet, numTapes)
    
    // Create a wrapper object to validate just the delta
    const deltaWrapper = { delta: spec.delta }
    const wrapperSchema = {
      type: "object",
      properties: {
        delta: deltaSchema
      },
      required: ["delta"]
    }
    
    // Compile and validate
    const deltaValidate = this.ajv.compile(wrapperSchema)
    
    if (!deltaValidate(deltaWrapper)) {
      const errors = deltaValidate.errors || []
      const formattedErrors = ParserUtil.formatValidationErrors(originalYaml, doc, errors, lineCounter)
      throw new Error(formattedErrors.map(e => e.message).join('\n\n'))
    }
  }

  /**
   * Build dynamic schema for delta validation with precise error positioning
   */
  private buildDeltaSchema(states: string[], tapeAlphabet: string[], numTapes: number): object {
    const deltaProperties: Record<string, any> = {}
    
    // Generate explicit properties for each valid state
    for (const state of states) {
      deltaProperties[state] = {
        type: "object",
        // Allow any string property since wildcards make exact enumeration impractical
        additionalProperties: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: [
            {
              // Next state
              type: "string",
              enum: states,
              errorMessage: `Next state must be one of the defined states: ${setNotation(states)}`
            },
            {
              // Symbol to write (must match tape alphabet length, allows wildcards)
              type: "string",
              minLength: numTapes,
              maxLength: numTapes,
              errorMessage: `Write symbols must be exactly ${numTapes} characters from tape alphabet (or wildcard ?): ${setNotation(tapeAlphabet)}`
            },
            {
              // Direction (L, R, or S for Stay) - one character per tape
              type: "string",
              minLength: numTapes,
              maxLength: numTapes,
              pattern: `^[LRS]{${numTapes}}$`,
              errorMessage: `Direction must be exactly ${numTapes} characters, each being 'L' (left), 'R' (right), or 'S' (stay)`
            }
          ],
          errorMessage: "Transition must be an array of [next_state, write_symbols, direction]"
        }
      }
    }

    return {
      type: "object",
      properties: deltaProperties,
      additionalProperties: false,
      errorMessage: {
        additionalProperties: `Transition from unknown state - must be one of the defined states: ${setNotation(states)}`
      }
    }
  }

}