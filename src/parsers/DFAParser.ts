import { parseDocument, LineCounter } from 'yaml'
import Ajv, { type ValidateFunction } from 'ajv'
import addErrors from 'ajv-errors'
import { DFA } from '../core/DFA'
import { setNotation } from '../core/Utils'
import { ParserUtil } from './ParserUtil'
import dfaBaseSchema from './dfa-base-schema.json'

/**
 * Interface representing the YAML structure for DFA specifications
 */
export interface DFASpec {
  states: string[]
  input_alphabet: string[]
  start_state: string
  accept_states: string[]
  delta: Record<string, Record<string, string>>
}

/**
 * Enhanced DFA Parser that maps validation errors back to original YAML source
 * Uses yaml package's CST and LineCounter for precise source position tracking
 */
export class DFAParser {
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
    this.baseValidate = this.ajv.compile(dfaBaseSchema)
  }

  /**
   * Parse YAML string into a DFA instance with original source error mapping
   * @param yamlString - YAML specification of the DFA
   * @returns DFA instance
   * @throws Error with precise YAML source positioning
   */
  parseDFA(yamlString: string): DFA {
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
    const normalizedSpec = ParserUtil.normalizeSpec(parsed)

    // PASS 1: Base structure validation (states, input_alphabet, start_state, accept_states)
    if (!this.baseValidate(normalizedSpec)) {
      const errors = this.baseValidate.errors || []
      const formattedErrors = ParserUtil.formatValidationErrors(yamlString, doc, errors, lineCounter)
      throw new Error(formattedErrors.map(e => e.message).join('\n\n'))
    }

    const spec = normalizedSpec as DFASpec

    // PASS 2: Dynamic delta validation with precise error positioning
    this.validateDelta(spec, yamlString, doc, lineCounter)

    try {
      return new DFA(
        spec.states,
        spec.input_alphabet,
        spec.start_state,
        spec.accept_states,
        spec.delta
      )
    } catch (error) {
      throw new Error(`DFA construction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  /**
   * PASS 2: Validate delta structure using dynamically generated schema
   * This provides precise error positioning for individual delta properties, since
   * for some reason ajv-errors can referenc $data (e.g., for the set of states and input symbols)
   * in arrays, but not in object property/keys. So to validate that the keys (input states and symbols)
   * are valid, we dynamically generate a schema that explicitly lists all valid states and symbols.
   */
  private validateDelta(spec: DFASpec, originalYaml: string, doc: any, lineCounter: LineCounter): void {
    // Build dynamic schema for delta validation
    const deltaSchema = this.buildDeltaSchema(spec.states, spec.input_alphabet)
    
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
  private buildDeltaSchema(states: string[], inputAlphabet: string[]): object {
    const deltaProperties: Record<string, any> = {}
    
    // Generate explicit properties for each valid state
    for (const state of states) {
      deltaProperties[state] = {
        type: "object",
        properties: {},
        additionalProperties: false,
        errorMessage: {
          additionalProperties: `transition input symbol must be one of the defined input symbols: ${setNotation(inputAlphabet)}`
        }
      }
      
      // Generate explicit properties for each valid symbol
      for (const symbol of inputAlphabet) {
        deltaProperties[state].properties[symbol] = {
          type: "string", 
          enum: states,
          errorMessage: `transition input state must be one of the defined states: ${setNotation(states)}`
        }
      }
    }

    return {
      type: "object",
      properties: deltaProperties,
      additionalProperties: false,
      errorMessage: {
        additionalProperties: `transition input state must be one of the defined states: ${setNotation(states)}`
      }
    }
  }


}