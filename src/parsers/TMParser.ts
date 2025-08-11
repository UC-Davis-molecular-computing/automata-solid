import { parseDocument, LineCounter, Document } from 'yaml'
import Ajv, { type ValidateFunction } from 'ajv'
import addErrors from 'ajv-errors'
import { TM } from '../core/TM'
import { setNotation } from '../core/Utils'
import { ParserUtil, type FormattedError } from './ParserUtil'
import tmBaseSchema from './tm-base-schema.json'

/**
 * Interface for TM JSON Schema property definitions
 */
interface TMSchemaProperty {
  type: string;
  patternProperties: Record<string, {
    type: string;
    minItems: number;
    maxItems: number;
    items: Array<{
      type: string;
      enum?: string[];
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      errorMessage: string;
    }>;
    errorMessage: string;
  }>;
  additionalProperties: boolean;
  errorMessage: {
    additionalProperties: string;
  };
}

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
    const result = this.validateTM(yamlString)
    if (!result.tm) {
      console.assert(result.errors.length > 0, 'Expected validation errors when tm is not defined')
      throw new Error(result.errors.map(e => e.message).join('\n\n'))
    }
    return result.tm
  }

  /**
   * Validate TM and return structured errors (for linter use)
   * @param yamlString - YAML specification of the TM
   * @returns Object with either TM instance or structured errors
   */
  validateTM(yamlString: string): { tm?: TM; errors: FormattedError[] } {
    try {
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
        
        return {
          errors: [{
            message: ParserUtil.formatYamlSyntaxError(yamlString, firstError.message, position),
            path: 'root',
            position
          }]
        }
      }
      
      // Convert document to JavaScript object
      const parsed = doc.toJS()

      // Normalize the parsed data to handle numbers as strings
      const normalizedSpec = ParserUtil.normalizeTMSpec(parsed)

      const spec = normalizedSpec as TMSpec

      // PASS 1: Base structure validation (states, input_alphabet, start_state, accept_states)
      // This includes checking that _ is not in input_alphabet
      if (!this.baseValidate(normalizedSpec)) {
        const errors = this.baseValidate.errors || []
        const formattedErrors = ParserUtil.formatValidationErrors(yamlString, doc, errors, lineCounter)
        return { errors: formattedErrors }
      }

      // PASS 2: Custom validations (alphabet overlap)
      // Build complete tape alphabet and validate
      const tapeAlphabetExtraSet = new Set(spec.tape_alphabet_extra || [])
      if (!tapeAlphabetExtraSet.has('_')) {
        tapeAlphabetExtraSet.add('_')
      }
      const finalTapeAlphabetExtra = Array.from(tapeAlphabetExtraSet)
      const tapeAlphabet = [...(spec.input_alphabet || []), ...finalTapeAlphabetExtra]
      
      // Check for overlaps between input_alphabet and tape_alphabet_extra
      const inputSet = new Set(spec.input_alphabet || [])
      const extraSet = new Set(finalTapeAlphabetExtra)
      const intersection = new Set([...inputSet].filter(x => extraSet.has(x)))
      if (intersection.size > 0) {
        const overlapErrors = this.getAlphabetOverlapErrors(spec, Array.from(intersection), yamlString, doc, lineCounter)
        return { errors: overlapErrors }
      }

      // PASS 3: Dynamic delta validation with precise error positioning
      const deltaErrors = this.getDeltaValidationErrors(spec, tapeAlphabet, yamlString, doc, lineCounter)
      if (deltaErrors.length > 0) {
        return { errors: deltaErrors }
      }

      try {
        const tm = new TM(
          spec.states,
          spec.input_alphabet,
          tapeAlphabet,
          spec.start_state,
          spec.accept_state,
          spec.reject_state,
          spec.delta
        )
        return { tm, errors: [] }
      } catch (error) {
        return {
          errors: [{
            message: `TM construction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            path: 'root',
            position: undefined
          }]
        }
      }
    } catch (error) {
      return {
        errors: [{
          message: error instanceof Error ? error.message : 'Unknown validation error',
          path: 'root',
          position: undefined
        }]
      }
    }
  }

  /**
   * Get delta validation errors without throwing (for linter use)
   */
  private getDeltaValidationErrors(spec: TMSpec, tapeAlphabet: string[], originalYaml: string, doc: Document, lineCounter: LineCounter): FormattedError[] {
    // Determine number of tapes from first transition
    const firstState = Object.keys(spec.delta)[0]
    const firstSymbols = firstState ? Object.keys(spec.delta[firstState])[0] : undefined
    if (!firstSymbols) {
      return [{
        message: 'Delta must contain at least one transition',
        path: '/delta',
        position: undefined
      }]
    }
    const numTapes = firstSymbols.length

    // Build dynamic schema for delta validation (includes tape count consistency check)
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
      return ParserUtil.formatValidationErrors(originalYaml, doc, errors, lineCounter)
    }
    
    return []
  }


  /**
   * Get alphabet overlap errors without throwing (for linter use)
   */
  private getAlphabetOverlapErrors(spec: TMSpec, overlappingSymbols: string[], yamlString: string, doc: Document, lineCounter: LineCounter): FormattedError[] {
    // Create AJV-style errors for the overlapping symbols to use with formatValidationErrors
    const ajvErrors = []
    
    for (const symbol of overlappingSymbols) {
      const symbolIndex = spec.tape_alphabet_extra.indexOf(symbol)
      if (symbolIndex >= 0) {
        ajvErrors.push({
          instancePath: `/tape_alphabet_extra/${symbolIndex}`,
          schemaPath: '#/properties/tape_alphabet_extra/items',
          keyword: 'custom',
          data: symbol,
          message: `Input alphabet and tape alphabet extra cannot overlap. Found overlapping symbols: ${setNotation(overlappingSymbols)}`,
          params: {}
        })
      }
    }
    
    if (ajvErrors.length === 0) {
      // Fallback error
      ajvErrors.push({
        instancePath: '/tape_alphabet_extra',
        schemaPath: '#/properties/tape_alphabet_extra',
        keyword: 'custom',
        data: spec.tape_alphabet_extra,
        message: `Input alphabet and tape alphabet extra cannot overlap. Found overlapping symbols: ${setNotation(overlappingSymbols)}`,
        params: {}
      })
    }
    
    // Use the same formatting as other validation errors
    return ParserUtil.formatValidationErrors(yamlString, doc, ajvErrors, lineCounter)
  }


  /**
   * Build dynamic schema for delta validation with precise error positioning
   */
  private buildDeltaSchema(states: string[], tapeAlphabet: string[], numTapes: number): object {
    const deltaProperties: Record<string, TMSchemaProperty> = {}
    
    // Generate explicit properties for each valid state
    for (const state of states) {
      deltaProperties[state] = {
        type: "object",
        // Use patternProperties to validate input symbol length
        patternProperties: {
          [`^.{${numTapes}}$`]: {
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
        },
        // Reject any properties that don't match the length requirement
        additionalProperties: false,
        errorMessage: {
          additionalProperties: `All input symbols must be exactly ${numTapes} characters (determined from first transition). Check for inconsistent tape counts.`
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

  static getDefaultYAML(): string {
    return `# TM deciding { w in {0,1}* | w = w^R } (palindromes)

states: [s, r00, r11, r01, r10, l, lx, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: [x, _]
start_state: s
accept_state: qA
reject_state: qR

delta:
  s:
    0: [r00, x, R]
    1: [r11, x, R]
    x: [qA, x, S]    # empty string is palindrome
  r00:
    0: [r00, 0, R]
    1: [r01, 1, R]
    _: [lx, _, L]
    x: [lx, x, L]
  r01:
    0: [r00, 0, R]
    1: [r01, 1, R]
  r10:
    0: [r10, 0, R]
    1: [r11, 1, R]
  r11:
    0: [r10, 0, R]
    1: [r11, 1, R]
    _: [lx, _, L]
    x: [lx, x, L]
  lx:
    0: [l, x, L]
    1: [l, x, L]
    x: [qA, x, S]    # all matched
  l:
    0: [l, 0, L]
    1: [l, 1, L]
    x: [s, x, R]`
  }

}