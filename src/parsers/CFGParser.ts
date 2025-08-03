import { parseDocument, LineCounter } from 'yaml'
import Ajv from 'ajv'
import addErrors from 'ajv-errors'
import { CFG, Rule } from '../core/CFG'
import { setNotation } from '../core/Utils'
import { ParserUtil } from './ParserUtil'

/**
 * Interface representing the YAML structure for CFG specifications
 * Format:
 * S: [0S1, '', A]
 * A: 10
 * A: ''
 * 
 * Which is equivalent to:
 * S: [0S1, '', A]
 * A: [10, '']
 */
export interface CFGSpec {
  [variable: string]: string | string[]
}

/**
 * Enhanced CFG Parser that maps validation errors back to original YAML source
 */
export class CFGParser {
  private ajv: Ajv

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      $data: true,
      verbose: true
    })
    addErrors(this.ajv)
  }

  /**
   * Parse YAML string into a CFG instance with original source error mapping
   * @param yamlString - YAML specification of the CFG
   * @returns CFG instance
   * @throws Error with precise YAML source positioning
   */
  parseCFG(yamlString: string): CFG {
    // Create LineCounter for position tracking
    const lineCounter = new LineCounter()
    
    // Parse YAML using the yaml package with CST preservation
    const doc = parseDocument(yamlString, { 
      lineCounter,
      keepSourceTokens: true
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

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('CFG must contain at least one variable (production rule)')
    }

    // Normalize the parsed data
    const normalizedSpec = ParserUtil.normalizeCFGSpec(parsed)

    // Validate basic structure
    this.validateBasicStructure(normalizedSpec, yamlString, doc, lineCounter)

    // Convert to CFG format
    return this.buildCFG(normalizedSpec)
  }

  /**
   * Validate the basic structure of the CFG specification
   */
  private validateBasicStructure(spec: CFGSpec, originalYaml: string, doc: any, lineCounter: LineCounter): void {
    const variables = Object.keys(spec)
    
    if (variables.length === 0) {
      throw new Error('CFG must contain at least one variable (production rule)')
    }

    // Validate variable names (must be single characters)
    for (const variable of variables) {
      if (variable.length !== 1) {
        throw new Error(`Variable names must be exactly 1 character, but found "${variable}"`)
      }
    }

    // Build schema for validation
    const schema = {
      type: "object",
      patternProperties: {
        "^.{1}$": { // Single character keys
          oneOf: [
            { type: "string" },
            { 
              type: "array", 
              items: { type: "string" },
              minItems: 1
            }
          ]
        }
      },
      additionalProperties: false,
      minProperties: 1,
      errorMessage: {
        additionalProperties: "Variable names must be exactly 1 character",
        minProperties: "CFG must contain at least one variable"
      }
    }

    const validate = this.ajv.compile(schema)
    
    if (!validate(spec)) {
      const errors = validate.errors || []
      const formattedErrors = ParserUtil.formatValidationErrors(originalYaml, doc, errors, lineCounter)
      throw new Error(formattedErrors.map(e => e.message).join('\n\n'))
    }
  }

  /**
   * Build CFG from normalized specification
   */
  private buildCFG(spec: CFGSpec): CFG {
    const variables = Object.keys(spec)
    const startSymbol = variables[0] // First variable is start symbol
    const rules: Rule[] = []
    const allSymbols = new Set<string>()

    // Extract all rules and symbols
    for (const [variable, productions] of Object.entries(spec)) {
      const productionList = Array.isArray(productions) ? productions : [productions]
      
      for (const production of productionList) {
        // Add rule
        rules.push(new Rule(variable, production))
        
        // Extract symbols from production
        for (const symbol of production) {
          allSymbols.add(symbol)
        }
      }
    }

    // Determine terminals vs variables
    const variableSet = new Set(variables)
    const terminals = Array.from(allSymbols).filter(symbol => !variableSet.has(symbol)).sort()

    // Check for variable-terminal conflicts BEFORE creating CFG
    const terminalSet = new Set(terminals)
    const intersection = new Set([...variableSet].filter(x => terminalSet.has(x)))
    
    if (intersection.size > 0) {
      throw new Error(
        `Variables and terminals cannot overlap. Found overlapping symbols: ${setNotation(Array.from(intersection))}`
      )
    }

    // Validate that all symbols in productions are either variables or single-character terminals
    for (const rule of rules) {
      for (const symbol of rule.outputString) {
        if (!variableSet.has(symbol) && !terminals.includes(symbol)) {
          // This should not happen due to our extraction logic, but check anyway
          throw new Error(`Unknown symbol "${symbol}" in production ${rule.toString()}`)
        }
      }
    }

    // Additional validations
    this.validateSemantics(variables, terminals, rules, startSymbol)

    return new CFG(terminals, variables, rules, startSymbol)
  }

  /**
   * Perform semantic validation of the CFG
   */
  private validateSemantics(variables: string[], terminals: string[], rules: Rule[], startSymbol: string): void {
    // Check for symbol conflicts
    const terminalSet = new Set(terminals)
    const variableSet = new Set(variables)
    const intersection = new Set([...terminalSet].filter(x => variableSet.has(x)))
    
    if (intersection.size > 0) {
      throw new Error(
        `Variables and terminals cannot overlap. Found overlapping symbols: ${setNotation(Array.from(intersection))}`
      )
    }

    // Validate that we have at least one rule
    if (rules.length === 0) {
      throw new Error('CFG must contain at least one production rule')
    }

    // Check that start symbol has at least one rule
    const startRules = rules.filter(rule => rule.inputSymbol === startSymbol)
    if (startRules.length === 0) {
      throw new Error(`Start symbol "${startSymbol}" must have at least one production rule`)
    }

    // Check for unreachable variables (optional warning - could be implemented)
    // This is more complex and might not be necessary for basic functionality
  }
}

// Add utility methods to ParserUtil for CFG-specific normalization
declare module './ParserUtil' {
  namespace ParserUtil {
    function normalizeCFGSpec(parsed: any): CFGSpec
  }
}

// Extend ParserUtil with CFG-specific methods
ParserUtil.normalizeCFGSpec = function(parsed: any): CFGSpec {
  const result: CFGSpec = {}
  
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      result[key] = value
    } else if (Array.isArray(value)) {
      // Ensure all array elements are strings
      result[key] = value.map(item => String(item))
    } else if (typeof value === 'object' && value !== null) {
      // Reject nested objects
      throw new Error(`Variable "${key}" cannot have object value. Productions must be strings or arrays of strings.`)
    } else {
      // Convert other types to string
      result[key] = String(value)
    }
  }
  
  return result
}