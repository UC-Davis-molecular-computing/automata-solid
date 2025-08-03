/**
 * Helper function to escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * A regular expression to decide a language for theory of computing.
 * 
 * Restrictions:
 * - Only alphanumeric characters and symbols: @ . ( ) * + | = ;
 * - Matches whole string, not substring
 * - Supports subexpressions via variable substitution
 * - Spaces are stripped from input
 */
export class Regex {
  private readonly originalRegexStr: string
  private readonly pattern: RegExp
  private readonly inputAlphabet: string[]

  constructor(regexStr: string) {
    // Store original before any processing
    this.originalRegexStr = regexStr
    
    // Process subexpressions first (before stripping whitespace)
    const processedStr = this.processSubexpressions(regexStr)
    
    // Strip all whitespace after processing subexpressions
    const cleanedStr = processedStr.replace(/\s+/g, '')

    // Validate allowed characters
    this.validateCharacters(cleanedStr)

    // Create regex pattern - escape dots and anchor to match whole string
    const escapedStr = cleanedStr.replace(/\./g, '\\.')
    this.pattern = new RegExp(`^(${escapedStr})$`)

    // Extract input alphabet from processed string
    this.inputAlphabet = this.extractInputAlphabet(cleanedStr)
  }

  /**
   * Get the substitution steps for subexpressions, if any are used.
   * Returns an array of objects with expression and remaining subexpressions.
   */
  getSubstitutionSteps(): Array<{expression: string, subexpressions: string}> {
    if (!this.originalRegexStr.includes(';')) {
      return []
    }
    
    return this.processSubexpressionsWithSteps(this.originalRegexStr)
  }

  /**
   * Process subexpressions and return intermediate steps with remaining definitions.
   */
  private processSubexpressionsWithSteps(regexStr: string): Array<{expression: string, subexpressions: string}> {
    if (!regexStr.includes(';')) {
      return []
    }

    const parts = regexStr.split(';')
    if (parts.length < 2 || parts[parts.length - 1].trim() === '') {
      throw new Error('Invalid subexpression format: must end with semicolon before final expression')
    }

    const definitions = new Map<string, string>()
    const steps: Array<{expression: string, subexpressions: string}> = []
    
    // Process all but the last part as variable definitions
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i].trim()
      const equalIndex = part.indexOf('=')
      
      if (equalIndex === -1) {
        throw new Error(`Invalid subexpression definition: "${part}" (missing =)`)
      }
      
      const varName = part.substring(0, equalIndex).trim()
      const varValue = part.substring(equalIndex + 1).trim()
      
      if (!varName) {
        throw new Error(`Invalid variable name in: "${part}"`)
      }
      
      if (!varValue) {
        throw new Error(`Invalid variable value in: "${part}"`)
      }
      
      // Validate variable name (should be alphanumeric)
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(varName)) {
        throw new Error(`Invalid variable name "${varName}": must start with letter and contain only alphanumeric characters`)
      }
      
      definitions.set(varName, varValue)
    }

    // Create the original subexpressions string
    const originalSubexpressions = Array.from(definitions.entries())
      .map(([name, value]) => `${name} = ${value}`)
      .join('; ') + ';'

    // The final expression
    let finalExpression = parts[parts.length - 1].trim()
    
    // Add initial step
    steps.push({
      expression: finalExpression,
      subexpressions: originalSubexpressions
    })
    
    // Iteratively substitute variables (longer names first to avoid partial matches)
    const sortedVars = Array.from(definitions.keys()).sort((a, b) => b.length - a.length)
    
    let changed = true
    let iterations = 0
    const maxIterations = 100 // Prevent infinite loops
    
    while (changed && iterations < maxIterations) {
      changed = false
      iterations++
      
      for (const varName of sortedVars) {
        const varValue = definitions.get(varName)!
        const oldExpression = finalExpression
        
        // Replace all occurrences - variables are single letters and should be substituted everywhere they appear
        const regex = new RegExp(escapeRegExp(varName), 'g')
        finalExpression = finalExpression.replace(regex, `(${varValue})`)
        
        if (finalExpression !== oldExpression) {
          changed = true
          
          // Calculate remaining definitions by checking which variables still appear in the expression
          const remainingDefinitions = new Map<string, string>()
          for (const [name, value] of definitions.entries()) {
            const varRegex = new RegExp(escapeRegExp(name))
            if (varRegex.test(finalExpression)) {
              remainingDefinitions.set(name, value)
            }
          }
          
          // Create remaining subexpressions string
          const remainingSubexpressionsStr = Array.from(remainingDefinitions.entries())
            .map(([name, value]) => `${name} = ${value}`)
            .join('; ') + (remainingDefinitions.size > 0 ? ';' : '')
          
          // Add this step
          steps.push({
            expression: finalExpression.trim(),
            subexpressions: remainingSubexpressionsStr
          })
        }
      }
    }
    
    if (iterations >= maxIterations) {
      throw new Error('Subexpression substitution exceeded maximum iterations (possible circular reference)')
    }
    
    return steps
  }

  /**
   * Process subexpressions by iteratively substituting variables.
   * Format: "VAR1 = expr1; VAR2 = expr2; final_expression"
   */
  private processSubexpressions(regexStr: string): string {
    if (!regexStr.includes(';')) {
      return regexStr
    }

    const parts = regexStr.split(';')
    if (parts.length < 2 || parts[parts.length - 1].trim() === '') {
      throw new Error('Invalid subexpression format: must end with semicolon before final expression')
    }

    const definitions = new Map<string, string>()
    
    // Process all but the last part as variable definitions
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i].trim()
      const equalIndex = part.indexOf('=')
      
      if (equalIndex === -1) {
        throw new Error(`Invalid subexpression definition: "${part}" (missing =)`)
      }
      
      const varName = part.substring(0, equalIndex).trim()
      const varValue = part.substring(equalIndex + 1).trim()
      
      if (!varName) {
        throw new Error(`Invalid variable name in: "${part}"`)
      }
      
      if (!varValue) {
        throw new Error(`Invalid variable value in: "${part}"`)
      }
      
      // Validate variable name (should be alphanumeric)
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(varName)) {
        throw new Error(`Invalid variable name "${varName}": must start with letter and contain only alphanumeric characters`)
      }
      
      definitions.set(varName, varValue)
    }

    // The final expression
    let finalExpression = parts[parts.length - 1].trim()
    
    // Iteratively substitute variables (longer names first to avoid partial matches)
    const sortedVars = Array.from(definitions.keys()).sort((a, b) => b.length - a.length)
    
    let changed = true
    let iterations = 0
    const maxIterations = 100 // Prevent infinite loops
    
    while (changed && iterations < maxIterations) {
      changed = false
      iterations++
      
      for (const varName of sortedVars) {
        const varValue = definitions.get(varName)!
        const oldExpression = finalExpression
        
        // Replace all occurrences - variables are single letters and should be substituted everywhere they appear
        const regex = new RegExp(escapeRegExp(varName), 'g')
        finalExpression = finalExpression.replace(regex, `(${varValue})`)
        
        if (finalExpression !== oldExpression) {
          changed = true
        }
      }
    }
    
    if (iterations >= maxIterations) {
      throw new Error('Subexpression substitution exceeded maximum iterations (possible circular reference)')
    }
    
    return finalExpression
  }

  /**
   * Validate that the regex contains only allowed characters
   */
  private validateCharacters(regexStr: string): void {
    const legalRegex = /^(\.|@|[a-zA-Z]|[0-9]|\(|\)|\+|\*|\||=|;)*$/
    
    if (!legalRegex.test(regexStr)) {
      throw new Error(
        `regex "${regexStr}" contains illegal characters; ` +
        'must contain only letters, numbers, and these symbols: @ . ( ) * + | = ;'
      )
    }
  }

  /**
   * Extract input alphabet from regex string
   */
  private extractInputAlphabet(regexStr: string): string[] {
    const alphabetSet = new Set<string>()
    
    for (let i = 0; i < regexStr.length; i++) {
      const ch = regexStr[i]
      // Add character if it's not a special operator
      if (ch !== '*' && ch !== '+' && ch !== '|' && ch !== '(' && ch !== ')') {
        alphabetSet.add(ch)
      }
    }
    
    return Array.from(alphabetSet).sort()
  }

  /**
   * Test if the regex accepts the given input string
   */
  accepts(input: string): boolean {
    return this.pattern.test(input)
  }

  /**
   * Get the input alphabet extracted from the regex
   */
  getInputAlphabet(): string[] {
    return [...this.inputAlphabet]
  }

  /**
   * Get the original regex string (before processing)
   */
  toString(): string {
    return this.originalRegexStr
  }

  /**
   * Static factory method to create regex from string
   */
  static fromString(regexStr: string): Regex {
    return new Regex(regexStr.trim())
  }
}