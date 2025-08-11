import { parseDocument, LineCounter, Document } from 'yaml'
import Ajv, { type ValidateFunction } from 'ajv'
import addErrors from 'ajv-errors'
import { NFA } from '../core/NFA'
import { setNotation } from '../core/Utils'
import { ParserUtil } from './ParserUtil'
import nfaBaseSchema from './nfa-base-schema.json'

/**
 * Interface for JSON Schema property definitions (NFA version)
 */
interface NFASchemaProperty {
  type: string;
  properties: Record<string, {
    oneOf: Array<{
      type: string;
      enum?: string[];
      items?: {
        type: string;
        enum: string[];
        errorMessage: string;
      };
      errorMessage: string | { type: string };
    }>;
    errorMessage: string;
  }>;
  additionalProperties: boolean;
  errorMessage: {
    additionalProperties: string;
  };
}

/**
 * Interface representing the YAML structure for NFA specifications
 */
export interface NFASpec {
  states: string[]
  input_alphabet: string[]
  start_state: string
  accept_states: string[]
  delta: Record<string, Record<string, string[]>>
}

/**
 * Enhanced NFA Parser that maps validation errors back to original YAML source
 * Uses yaml package's CST and LineCounter for precise source position tracking
 */
export class NFAParser {
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
    this.baseValidate = this.ajv.compile(nfaBaseSchema)
  }

  /**
   * Parse YAML string into an NFA instance with original source error mapping
   * @param yamlString - YAML specification of the NFA
   * @returns NFA instance
   * @throws Error with precise YAML source positioning
   */
  parseNFA(yamlString: string): NFA {
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
    const normalizedSpec = ParserUtil.normalizeNFASpec(parsed)

    // PASS 1: Base structure validation (states, input_alphabet, start_state, accept_states)
    if (!this.baseValidate(normalizedSpec)) {
      const errors = this.baseValidate.errors || []
      const formattedErrors = ParserUtil.formatValidationErrors(yamlString, doc, errors, lineCounter)
      throw new Error(formattedErrors.map(e => e.message).join('\n\n'))
    }

    const spec = normalizedSpec as NFASpec

    // PASS 2: Dynamic delta validation with precise error positioning
    this.validateDelta(spec, yamlString, doc, lineCounter)

    try {
      return new NFA(
        spec.states,
        spec.input_alphabet,
        spec.start_state,
        spec.accept_states,
        spec.delta
      )
    } catch (error) {
      throw new Error(`NFA construction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  /**
   * PASS 2: Validate delta structure using dynamically generated schema
   * This provides precise error positioning for individual delta properties
   */
  private validateDelta(spec: NFASpec, originalYaml: string, doc: Document, lineCounter: LineCounter): void {
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
    // Create enum for valid symbols (input alphabet + epsilon)
    const validSymbols = [...inputAlphabet, '']
    
    const deltaProperties: Record<string, NFASchemaProperty> = {}
    
    // Generate explicit properties for each valid state
    for (const state of states) {
      deltaProperties[state] = {
        type: "object",
        properties: {},
        additionalProperties: false,
        errorMessage: {
          additionalProperties: `transition input symbol must be one of the defined input symbols or empty string (epsilon): ${setNotation(validSymbols)}`
        }
      }
      
      // Generate explicit properties for each valid symbol
      for (const symbol of validSymbols) {
        deltaProperties[state].properties[symbol] = {
          oneOf: [
            {
              // Single target (DFA syntax - valid in NFA)
              type: "string",
              enum: states,
              errorMessage: `transition target state must be one of the defined states: ${setNotation(states)}`
            },
            {
              // Multiple targets (NFA syntax)
              type: "array",
              items: {
                type: "string", 
                enum: states,
                errorMessage: `transition target state must be one of the defined states: ${setNotation(states)}`
              },
              errorMessage: {
                type: "transition targets must be an array of states"
              }
            }
          ],
          errorMessage: `transition target must be either a single state or an array of states from: ${setNotation(states)}`
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

  static getDefaultYAML(): string {
    return `# NFA recognizing { x in {0,1}* | third-to-last bit of x is 0 }

states: [q1, q2, q3, q4]
input_alphabet: [0, 1]
start_state: q1
accept_states: [q4]

delta:
  q1:
    0: [q1, q2]
    1: q1
  q2:
    0: q3
    1: q3
  q3:
    0: q4
    1: q4`
  }

}