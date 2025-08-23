
import { assert, checkAgainstInputAlphabet } from './Utils'
import type { Automaton } from './Automaton'

export const EPSILON = 'ε'


/**
 * Represents a context-free grammar
 */
export class CFG implements Automaton {
  readonly terminals: string[]
  readonly variables: string[]
  readonly symbols: string[]
  readonly rules: Rule[]
  readonly startSymbol: string

  private mapInputSymbolToRules: Map<string, Rule[]> = new Map()
  readonly variablesSet: Set<string>
  readonly terminalsSet: Set<string>
  private nullables: Set<string> = new Set()

  constructor(terminals: string[], variables: string[], rules: Rule[], startSymbol: string) {
    this.terminals = [...terminals]
    this.variables = [...variables]
    this.rules = [...rules]
    this.startSymbol = startSymbol

    this.init()
    this.symbols = [...this.terminals, ...this.variables]
    this.variablesSet = new Set(this.variables)
    this.terminalsSet = new Set(this.terminals)
  }

  private init(): void {
    // Validate that terminals and variables don't intersect
    const terminalSet = new Set(this.terminals)
    const variableSet = new Set(this.variables)
    const intersection = new Set([...terminalSet].filter(x => variableSet.has(x)))
    
    if (intersection.size > 0) {
      throw new Error(
        `terminals and variables cannot intersect:\n` +
        `  terminals: ${this.terminals}\n  variables: ${this.variables}`
      )
    }

    // Validate that start symbol is in variables
    if (!this.variables.includes(this.startSymbol)) {
      throw new Error(
        `variables must contain start_symbol:\n` +
        `    start_symbol: ${this.startSymbol} variables: ${this.variables}`
      )
    }

    // Set CFG reference for all rules
    for (const rule of this.rules) {
      rule.cfg = this
    }

    // Build mapping from input symbols to rules
    this.mapInputSymbolToRules.clear()
    for (const rule of this.rules) {
      if (!this.mapInputSymbolToRules.has(rule.inputSymbol)) {
        this.mapInputSymbolToRules.set(rule.inputSymbol, [])
      }
      const rulesList = this.mapInputSymbolToRules.get(rule.inputSymbol)
      assert(rulesList, `Rule list should exist for symbol "${rule.inputSymbol}"`)
      rulesList.push(rule)
    }

    this.findNullables()
  }

  private findNullables(): void {
    this.nullables.clear()
    let sizeChanged = true
    
    while (sizeChanged) {
      const startSize = this.nullables.size
      
      for (const rule of this.rules) {
        if (rule.isEpsilon()) {
          this.nullables.add(rule.inputSymbol)
        } else if (rule.outputString.split('').every(symbol => this.nullables.has(symbol))) {
          this.nullables.add(rule.inputSymbol)
        }
      }
      
      sizeChanged = (this.nullables.size > startSize)
    }
  }

  accepts(input: string): boolean {
    // Validate input against terminal alphabet, similar to DFA
    checkAgainstInputAlphabet(this.terminals, input)
    
    const parser = new EarleyParser(this, input)
    return parser.accepts()
  }

  parseTree(input: string): TreeNode | undefined {
    // Validate input against terminal alphabet, similar to DFA
    checkAgainstInputAlphabet(this.terminals, input)
    
    const parser = new EarleyParser(this, input)
    return parser.parseTree()
  }

  /**
   * Returns true if symbol can derive the empty string
   */
  isNullable(symbol: string): boolean {
    return this.nullables.has(symbol)
  }

  getRulesWithInput(symbol: string): Rule[] {
    return this.mapInputSymbolToRules.get(symbol) || []
  }

  toString(_options?: { nice?: boolean }): string {
    return this.rules.map(rule => rule.toString()).join('\n')
  }

  equals(other: CFG): boolean {
    if (this.startSymbol !== other.startSymbol) return false
    if (this.terminals.length !== other.terminals.length) return false
    if (this.variables.length !== other.variables.length) return false
    if (this.rules.length !== other.rules.length) return false

    const thisTerminals = new Set(this.terminals)
    const otherTerminals = new Set(other.terminals)
    if (thisTerminals.size !== otherTerminals.size ||
        !Array.from(thisTerminals).every(t => otherTerminals.has(t))) {
      return false
    }

    const thisVariables = new Set(this.variables)
    const otherVariables = new Set(other.variables)
    if (thisVariables.size !== otherVariables.size ||
        !Array.from(thisVariables).every(v => otherVariables.has(v))) {
      return false
    }

    const thisRules = new Set(this.rules.map(r => `${r.inputSymbol}->${r.outputString}`))
    const otherRules = new Set(other.rules.map(r => `${r.inputSymbol}->${r.outputString}`))
    if (thisRules.size !== otherRules.size ||
        !Array.from(thisRules).every(r => otherRules.has(r))) {
      return false
    }

    return true
  }
}

/**
 * Represents a production rule for a CFG.
 * A rule has the form: input_symbol -> output_string
 */
export class Rule {
  readonly inputSymbol: string
  readonly outputString: string
  cfg?: CFG

  constructor(inputSymbol: string, outputSymbols: string | string[], cfg?: CFG) {
    if (inputSymbol.length !== 1) {
      throw new Error(`production rule must have exactly 1 input symbol, but instead has "${inputSymbol}"`)
    }
    
    this.inputSymbol = inputSymbol
    this.cfg = cfg
    
    if (typeof outputSymbols === 'string') {
      this.outputString = outputSymbols
    } else if (Array.isArray(outputSymbols)) {
      this.outputString = outputSymbols.join('')
    } else {
      throw new Error(`type of outputSymbols must be either string or string[] but is ${typeof outputSymbols}`)
    }
  }

  get length(): number {
    return this.outputString.length
  }

  charAt(index: number): string {
    return this.outputString[index]
  }

  isEpsilon(): boolean {
    return this.outputString.length === 0
  }

  toString(): string {
    return `${this.inputSymbol} -> ${this.outputString.length === 0 ? EPSILON : this.outputString}`
  }

  equals(other: Rule): boolean {
    return this.inputSymbol === other.inputSymbol && this.outputString === other.outputString
  }
}

/**
 * Represents a state in the Earley parser (also known as a "chart row")
 */
export class Row {
  readonly rule: Rule
  readonly dotPosition: number
  readonly inputStartPosition: number
  dotSymbol: string = '.'
  
  // Used for constructing parse trees
  completing?: Row
  previous?: Row

  private static readonly alternateDotSymbols = ['#', '*', '@', '!', '$', '^', '+']

  constructor(rule: Rule, dotPosition: number, inputStartPosition: number) {
    if (dotPosition < 0 || dotPosition > rule.length) {
      throw new Error(`dotPosition (= ${dotPosition}) must be between 0 and ${rule.length}`)
    }
    
    this.rule = rule
    this.dotPosition = dotPosition
    this.inputStartPosition = inputStartPosition

    // Find alternative dot symbol if '.' is used in the grammar
    if (rule.cfg?.symbols.includes('.')) {
      for (const altSymbol of Row.alternateDotSymbols) {
        if (!rule.cfg.symbols.includes(altSymbol)) {
          this.dotSymbol = altSymbol
          break
        }
      }
      if (this.dotSymbol === '.') {
        throw new Error(
          `since the grammar of rule ${rule} contains "." symbol, it must leave out at least ` +
          `one of ${Row.alternateDotSymbols.join(',')} to be used as the "dot" for display`
        )
      }
    }
  }

  scannedString(): string {
    return this.rule.outputString.substring(0, this.dotPosition)
  }

  unscannedString(): string {
    return this.rule.outputString.substring(this.dotPosition)
  }

  dotPositionAtStart(): boolean {
    return this.dotPosition === 0
  }

  isComplete(): boolean {
    return this.dotPosition === this.rule.length
  }

  nextSymbol(): string {
    return this.rule.charAt(this.dotPosition)
  }

  previousSymbol(): string {
    return this.rule.charAt(this.dotPosition - 1)
  }

  toString(): string {
    return `(${this.rule.inputSymbol} -> ${this.scannedString()}${this.dotSymbol}${this.unscannedString()}, ${this.inputStartPosition})`
  }

  equals(other: Row): boolean {
    return this.rule.equals(other.rule) && 
           this.dotPosition === other.dotPosition && 
           this.inputStartPosition === other.inputStartPosition
  }
}

/**
 * Represents a collection of rows for a single input position in the Earley parser
 */
export class Chart {
  readonly rows: Row[] = []
  private readonly rowsSet = new Set<string>()

  addRow(row: Row): void {
    const key = this.getRowKey(row)
    if (!this.rowsSet.has(key)) {
      this.rows.push(row)
      this.rowsSet.add(key)
    }
  }

  private getRowKey(row: Row): string {
    return `${row.rule.inputSymbol}->${row.rule.outputString}|${row.dotPosition}|${row.inputStartPosition}`
  }

  get length(): number {
    return this.rows.length
  }

  toString(): string {
    return this.rows.join('\n')
  }
}

/**
 * Represents a node in a parse tree
 */
export class TreeNode {
  parent?: TreeNode
  children: TreeNode[] = []
  readonly symbol: string

  constructor(symbol: string, options?: { parent?: TreeNode, children?: TreeNode[] }) {
    this.symbol = symbol
    this.parent = options?.parent
    this.children = options?.children || []
    
    // Set parent reference for all children
    for (const child of this.children) {
      child.parent = this
    }
  }

  toString(): string {
    const parentSym = this.parent?.symbol || 'none'
    const childSyms = this.children.map(node => node.symbol).join(',')
    return `Node(${this.symbol}, par:${parentSym}, children: ${childSyms})`
  }

  /**
   * Returns a formatted tree representation
   */
  toTreeString(): string {
    const buffer: string[] = []
    this.buildTreeString(buffer, '', true)
    return buffer.join('')
  }

  /**
   * Returns a graphviz DOT representation of the parse tree
   */
  toGraphviz(): string {
    let dot = 'digraph {\n'
    dot += '  rankdir=TB;\n'  // Top-down layout
    dot += '  node [shape=circle];\n'  // Default node style without fill
    
    const nodeCounter = { count: 0 }
    const nodeMap = new Map<TreeNode, string>()
    
    // Generate nodes and edges
    dot += this.generateDotNodes(nodeCounter, nodeMap)
    dot += this.generateDotEdges(nodeMap)
    
    dot += '}\n'
    return dot
  }

  private generateDotNodes(nodeCounter: { count: number }, nodeMap: Map<TreeNode, string>): string {
    const nodeId = `node${nodeCounter.count++}`
    nodeMap.set(this, nodeId)
    
    // Style leaf nodes based on type
    const isLeaf = this.children.length === 0
    let nodeAttrs = `label="${this.symbol}"`
    
    if (isLeaf) {
      if (this.symbol === EPSILON) {
        nodeAttrs += `, class="epsilon-leaf"`
      } else {
        nodeAttrs += `, class="terminal-leaf"`
      }
    } else {
      nodeAttrs += `, class="variable-node"`
    }
    
    let dot = `  ${nodeId} [${nodeAttrs}];\n`
    
    for (const child of this.children) {
      dot += child.generateDotNodes(nodeCounter, nodeMap)
    }
    
    return dot
  }

  private generateDotEdges(nodeMap: Map<TreeNode, string>): string {
    let dot = ''
    const thisNodeId = nodeMap.get(this)
    
    for (const child of this.children) {
      const childNodeId = nodeMap.get(child)
      dot += `  ${thisNodeId} -> ${childNodeId};\n`
      dot += child.generateDotEdges(nodeMap)
    }
    
    return dot
  }

  private buildTreeString(buffer: string[], prefix: string, tail: boolean): void {
    const BOT = '└'
    const MID = '├'
    const MIDJ = '│'
    const HORZ = '─'
    const SP = ' '
    
    buffer.push(prefix + (tail ? `${BOT}${HORZ}${HORZ}${HORZ}` : `${MID}${HORZ}${HORZ}${HORZ}`) + this.symbol + '\n')
    
    for (let i = 0; i < this.children.length - 1; i++) {
      this.children[i].buildTreeString(
        buffer, 
        prefix + (tail ? `${SP}${SP}${SP}${SP}` : `${MIDJ}${SP}${SP}${SP}`), 
        false
      )
    }
    
    if (this.children.length > 0) {
      this.children[this.children.length - 1].buildTreeString(
        buffer,
        prefix + (tail ? `${SP}${SP}${SP}${SP}` : `${MIDJ}${SP}${SP}${SP}`),
        true
      )
    }
  }

  equals(other: TreeNode): boolean {
    if (this.symbol !== other.symbol) return false
    if (this.children.length !== other.children.length) return false
    
    for (let i = 0; i < this.children.length; i++) {
      if (!this.children[i].equals(other.children[i])) return false
    }
    
    return true
  }
}

/**
 * Implements the Earley parser algorithm for context-free grammars
 */
export class EarleyParser {
  private readonly cfg: CFG
  private readonly input: string
  private readonly charts: Chart[]

  constructor(cfg: CFG, input: string) {
    this.cfg = cfg
    this.input = input
    this.charts = []
    this.initializeFirstChart()
    this.runEarleyAlgorithm()
  }

  private initializeFirstChart(): void {
    // Create charts for each input position + final position
    for (let i = 0; i <= this.input.length; i++) {
      this.charts.push(new Chart())
    }

    // Add all start rules to first chart
    for (const rule of this.cfg.rules) {
      if (rule.inputSymbol === this.cfg.startSymbol) {
        this.charts[0].addRow(new Row(rule, 0, 0))
      }
    }
  }

  /**
   * Runs the Earley algorithm to populate all charts
   * https://en.wikipedia.org/wiki/Earley_parser
   */
  private runEarleyAlgorithm(): void {
    for (let k = 0; k <= this.input.length; k++) {
      let numRowsChanged = true
      
      // Handle epsilon rules by iterating until no new rows are added
      while (numRowsChanged) {
        const numRowsStart = this.charts[k].length
        
        // Process each row in the current chart
        // Can't use for...of because we might add rows during iteration
        for (let i = 0; i < this.charts[k].length; i++) {
          const row = this.charts[k].rows[i]
          
          if (!row.isComplete()) {
            // Incomplete row: predict or scan
            const nextSymbol = row.nextSymbol()
            
            if (this.cfg.variables.includes(nextSymbol)) {
              // Predict: add all rules for the next symbol
              const rulesWithInput = this.cfg.getRulesWithInput(nextSymbol)
              for (const rule of rulesWithInput) {
                this.charts[k].addRow(new Row(rule, 0, k))
              }
            } else if (k < this.input.length && this.input[k] === nextSymbol) {
              // Scan: advance dot past terminal symbol
              const newRow = new Row(row.rule, row.dotPosition + 1, row.inputStartPosition)
              newRow.previous = row
              this.charts[k + 1].addRow(newRow)
            }
          } else {
            // Complete row: look for items that can be completed
            const B = row.rule.inputSymbol
            const x = row.inputStartPosition
            const chart = this.charts[x]
            
            // Check all rows in the chart where this rule started
            for (let j = 0; j < chart.length; j++) {
              const prevRow = chart.rows[j]
              if (!prevRow.isComplete() && prevRow.nextSymbol() === B) {
                const newRow = new Row(prevRow.rule, prevRow.dotPosition + 1, prevRow.inputStartPosition)
                newRow.completing = row
                newRow.previous = prevRow
                this.charts[k].addRow(newRow)
              }
            }
          }
        }
        
        numRowsChanged = (this.charts[k].length > numRowsStart)
      }
    }
  }

  accepts(): boolean {
    const finalChart = this.charts[this.charts.length - 1]
    
    for (const row of finalChart.rows) {
      if (row.inputStartPosition === 0 &&
          row.rule.inputSymbol === this.cfg.startSymbol &&
          row.isComplete()) {
        return true
      }
    }
    
    return false
  }

  /**
   * Returns a parse tree if the input is accepted, otherwise null
   */
  parseTree(): TreeNode | undefined {
    const finalChart = this.charts[this.charts.length - 1]
    
    for (const row of finalChart.rows) {
      if (row.inputStartPosition === 0 &&
          row.rule.inputSymbol === this.cfg.startSymbol &&
          row.isComplete()) {
        return this.buildTree(row)
      }
    }
    
    return undefined
  }

  private buildTree(rootRow: Row): TreeNode {
    if (rootRow.rule.isEpsilon()) {
      return new TreeNode(rootRow.rule.inputSymbol, {
        children: [new TreeNode(EPSILON)]
      })
    }

    // Build subtrees from right to left by following previous pointers
    let prevRow: Row | undefined = rootRow
    const subtrees: TreeNode[] = []
    
    while (prevRow && prevRow.dotPosition > 0) {
      const prevSymbol = prevRow.previousSymbol()
      let subtree: TreeNode
      
      if (this.cfg.variablesSet.has(prevSymbol)) {
        if (!prevRow.completing) {
          throw new Error('Expected completing row for variable symbol')
        }
        subtree = this.buildTree(prevRow.completing)
      } else {
        if (!this.cfg.terminalsSet.has(prevSymbol)) {
          throw new Error(`Unknown symbol: ${prevSymbol}`)
        }
        subtree = new TreeNode(prevSymbol)
      }
      
      subtrees.push(subtree)
      prevRow = prevRow.previous
    }
    
    // Reverse to get correct left-to-right order
    subtrees.reverse()
    
    return new TreeNode(rootRow.rule.inputSymbol, { children: subtrees })
  }
}
