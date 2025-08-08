import { setNotation, checkAgainstInputAlphabet, deltaKey, WILDCARD, wildcardMatch, wildcardMaskedOutput, wildcardIntersect, assert } from './Utils'
import type { Automaton } from './Automaton'

/**
 * Represents a difference between configurations for memory-efficient navigation.
 */
export class ConfigDiff {
  readonly oldState: string
  readonly newState: string
  readonly oldSymbols: string
  readonly newSymbols: string
  readonly headsPosMove: Int8Array
  readonly tapesLenDiff: Int8Array

  constructor(
    oldState: string,
    newState: string,
    oldSymbols: string,
    newSymbols: string,
    headsPosMove: Int8Array,
    tapesLenDiff: Int8Array
  ) {
    this.oldState = oldState
    this.newState = newState
    this.oldSymbols = oldSymbols
    this.newSymbols = newSymbols
    this.headsPosMove = headsPosMove
    this.tapesLenDiff = tapesLenDiff
  }

  /**
   * Create a ConfigDiff by comparing two configurations.
   */
  static diff(oldCfg: TMConfiguration, newCfg: TMConfiguration): ConfigDiff {
    if (oldCfg.tm.numTapes !== newCfg.tm.numTapes) {
      throw new Error(`configurations must have same number of tapes, but old_cfg has ${oldCfg.tm.numTapes} and new_cfg has ${newCfg.tm.numTapes}`)
    }

    const oldState = oldCfg.state
    const newState = newCfg.state
    const oldSymbols = oldCfg.currentScannedSymbols()

    // Compute new symbols at the old head positions
    let newSymbols = ''
    for (let i = 0; i < oldCfg.headsPos.length; i++) {
      const headPos = oldCfg.headsPos[i]
      const newTape = newCfg.tapes[i]
      const oldTape = oldCfg.tapes[i]
      
      if (headPos === newTape.length) {
        // If the tape head moved back, headPos may not be valid in new tape
        newSymbols += oldTape[headPos]
      } else if (headPos < newTape.length) {
        newSymbols += newTape[headPos]
      } else {
        throw new Error(`Invalid head position ${headPos} for tape ${i}`)
      }
    }

    const headsPosMove = new Int8Array(oldCfg.tm.numTapes)
    const tapesLenDiff = new Int8Array(oldCfg.tm.numTapes)
    
    for (let i = 0; i < oldCfg.headsPos.length; i++) {
      headsPosMove[i] = newCfg.headsPos[i] - oldCfg.headsPos[i]
      tapesLenDiff[i] = newCfg.tapes[i].length - oldCfg.tapes[i].length
    }

    return new ConfigDiff(oldState, newState, oldSymbols, newSymbols, headsPosMove, tapesLenDiff)
  }

  toString(): string {
    return `(states: ${this.oldState} → ${this.newState}\n` +
           `symbols: ${this.oldSymbols} → ${this.newSymbols}\n` +
           `head moves: [${Array.from(this.headsPosMove).join(', ')}]\n` +
           `tapes len diff: [${Array.from(this.tapesLenDiff).join(', ')}])`
  }
}

/**
 * Represents the configuration of a TM: state, tape head positions, and tape contents.
 */
export class TMConfiguration {
  readonly tm: TM
  state: string
  readonly headsPos: number[]
  // Each tape is an array of one-char strings for faster editing
  readonly tapes: string[][]

  constructor(tm: TM, state: string, headsPos: number[], tapes: string[][]) {
    this.tm = tm
    this.state = state
    this.headsPos = [...headsPos]
    this.tapes = tapes.map(tape => [...tape])
  }

  copy(): TMConfiguration {
    return new TMConfiguration(this.tm, this.state, this.headsPos, this.tapes)
  }

  /**
   * Indicates if this configuration is in a halting state.
   */
  isHalting(): boolean {
    return this.tm.isHalting(this.state)
  }

  /**
   * Return string of symbols currently being scanned by tape heads.
   */
  currentScannedSymbols(): string {
    return this.scannedSymbols(this.headsPos)
  }

  /**
   * Return string of symbols at given head positions.
   */
  scannedSymbols(headsPos: number[]): string {
    let symbols = ''
    for (let i = 0; i < headsPos.length; i++) {
      const headPos = headsPos[i]
      const tape = this.tapes[i]
      symbols += tape[headPos]
    }
    return symbols
  }

  /**
   * Return output string in this configuration according to output convention:
   * "String from position tape_head_pos to first blank symbol to the right".
   * The "output" tape is the last tape.
   */
  outputString(): string {
    const outputTapeIdx = this.tapes.length - 1
    const outputTape = this.tapes[outputTapeIdx]
    const tapeHeadPos = this.headsPos[outputTapeIdx]
    
    let posBlank = outputTape.indexOf(TM.BLANK, tapeHeadPos)
    if (posBlank === -1) {
      posBlank = outputTape.length
    }
    
    if (posBlank === tapeHeadPos) {
      return ''
    } else {
      return outputTape.slice(tapeHeadPos, posBlank).join('')
    }
  }

  /**
   * Changes this configuration to be the next one.
   * @throws Error if this is a halting configuration.
   */
  goToNextConfig(): void {
    if (this.isHalting()) {
      throw new Error(`there is no next configuration after configuration [${this.toString()}]`)
    }

    const scannedSymbols = this.currentScannedSymbols()
    
    // Look up transition with wildcard support in flattened delta
    let action: [string, string, string] | undefined
    let matchedPattern: string | undefined

    // First try exact match (non-wildcard transitions have precedence)
    const exactKey = deltaKey(this.state, scannedSymbols)
    if (this.tm.nonWildcardInputSymbols.get(this.state)?.has(scannedSymbols)) {
      action = this.tm.delta[exactKey]
      matchedPattern = scannedSymbols
    } else {
      // Try wildcard matching - find all patterns for this state
      const statePrefix = `${this.state},`
      for (const [key, transition] of Object.entries(this.tm.delta)) {
        if (key.startsWith(statePrefix)) {
          const pattern = key.slice(statePrefix.length)
          if (pattern.includes(WILDCARD) && wildcardMatch(scannedSymbols, pattern)) {
            action = transition
            matchedPattern = pattern
            break
          }
        }
      }
    }

    // If delta is not defined for the current inputs, then the TM rejects
    if (!action) {
      this.state = this.tm.rejectState
      return
    }

    const nextState = action[0]
    let nextSymbols = action[1]
    const moveDirections = action[2]
    
    // Apply wildcard masking to output if needed
    if (matchedPattern && matchedPattern.includes(WILDCARD) && nextSymbols.includes(WILDCARD)) {
      nextSymbols = wildcardMaskedOutput(scannedSymbols, nextSymbols)
    }

    // Parse move directions
    const moves: number[] = []
    for (let i = 0; i < moveDirections.length; i++) {
      const direction = moveDirections[i]
      let move: number
      if (direction === 'L') {
        move = -1
      } else if (direction === 'R') {
        move = 1
      } else if (direction === 'S') {
        move = 0
      } else {
        throw new Error(`direction ${direction} must be 'L', 'R', or 'S'`)
      }
      moves.push(move)
    }

    // Apply transitions to each tape
    for (let tapeIdx = 0; tapeIdx < this.tm.numTapes; tapeIdx++) {
      const tape = this.tapes[tapeIdx]
      const curHeadPos = this.headsPos[tapeIdx]
      const nextSymbol = nextSymbols[tapeIdx]
      const move = moves[tapeIdx]
      const nextHeadPos = Math.max(curHeadPos + move, 0)

      // Write new symbol
      tape[curHeadPos] = nextSymbol

      // Handle tape expansion/contraction using Elm-based logic
      const tapeChange = this.calculateTapeChange(nextSymbol, move, curHeadPos, tape)
      
      if (tapeChange === 'grow') {
        tape.push(TM.BLANK)
      } else if (tapeChange === 'shrink') {
        tape.pop()
      }
      // 'same' means no change to tape length

      this.headsPos[tapeIdx] = nextHeadPos
    }

    this.state = nextState
  }

  private calculateTapeChange(nextSymbol: string, move: number, headPos: number, tape: string[]): 'grow' | 'shrink' | 'same' {
    const isOnRightEnd = (headPos === tape.length - 1)
    const isNextRightEnd = (headPos === tape.length - 2)
    const endsInBlank = (tape[tape.length - 1] === TM.BLANK)
    const hasPenultimateBlank = (tape.length >= 2 && tape[tape.length - 2] === TM.BLANK)
    
    // Grow: if at right end AND (moving right OR writing non-blank)
    if (isOnRightEnd && (move === 1 || nextSymbol !== TM.BLANK)) {
      return 'grow'
    }
    // Shrink condition 1: moving left AND at right end AND writing blank AND penultimate is blank
    else if (move === -1 && isOnRightEnd && nextSymbol === TM.BLANK && hasPenultimateBlank) {
      return 'shrink'
    }
    // Shrink condition 2: NOT moving right AND next-to-right-end AND writing blank AND ends in blank
    else if (move !== 1 && isNextRightEnd && nextSymbol === TM.BLANK && endsInBlank) {
      return 'shrink'
    }
    else {
      return 'same'
    }
  }

  nextConfig(): TMConfiguration {
    const next = this.copy()
    next.goToNextConfig()
    return next
  }

  /**
   * Changes this configuration to be the next one and returns the ConfigDiff.
   * @throws Error if this is a halting configuration.
   */
  goToNextConfigWithDiff(): ConfigDiff {
    if (this.isHalting()) {
      throw new Error(`there is no next configuration after configuration [${this.toString()}]`)
    }
    
    const oldState = this.state
    const scannedSymbols = this.currentScannedSymbols()
    
    // Look up transition with wildcard support in flattened delta
    let action: [string, string, string] | undefined
    let matchedPattern: string | undefined

    // First try exact match (non-wildcard transitions have precedence)
    const exactKey = deltaKey(this.state, scannedSymbols)
    if (this.tm.nonWildcardInputSymbols.get(this.state)?.has(scannedSymbols)) {
      action = this.tm.delta[exactKey]
      matchedPattern = scannedSymbols
    } else {
      // Try wildcard matching - find all patterns for this state
      const statePrefix = `${this.state},`
      for (const [key, transition] of Object.entries(this.tm.delta)) {
        if (key.startsWith(statePrefix)) {
          const pattern = key.slice(statePrefix.length)
          if (pattern.includes(WILDCARD) && wildcardMatch(scannedSymbols, pattern)) {
            action = transition
            matchedPattern = pattern
            break
          }
        }
      }
    }

    // If delta is not defined for the current inputs, then the TM rejects
    if (!action) {
      const headsMove = new Int8Array(this.tm.numTapes).fill(0)
      const tapesLenDiff = new Int8Array(this.tm.numTapes).fill(0)
      const diff = new ConfigDiff(this.state, this.tm.rejectState, scannedSymbols, scannedSymbols, headsMove, tapesLenDiff)
      this.state = this.tm.rejectState
      return diff
    }

    // Save old configuration state for diff
    const oldHeadsPos = [...this.headsPos]
    const oldTapesLengths = this.tapes.map(tape => tape.length)
    
    // Apply the transition (similar to existing goToNextConfig logic)
    const nextState = action[0]
    let nextSymbols = action[1]
    const moveDirections = action[2]
    
    // Apply wildcard masking to output if needed
    if (matchedPattern && matchedPattern.includes(WILDCARD) && nextSymbols.includes(WILDCARD)) {
      nextSymbols = wildcardMaskedOutput(scannedSymbols, nextSymbols)
    }

    // Parse move directions
    const moves: number[] = []
    for (let i = 0; i < moveDirections.length; i++) {
      const direction = moveDirections[i]
      let move: number
      if (direction === 'L') {
        move = -1
      } else if (direction === 'R') {
        move = 1
      } else if (direction === 'S') {
        move = 0
      } else {
        throw new Error(`direction ${direction} must be 'L', 'R', or 'S'`)
      }
      moves.push(move)
    }

    // Apply transitions to each tape
    for (let tapeIdx = 0; tapeIdx < this.tm.numTapes; tapeIdx++) {
      const tape = this.tapes[tapeIdx]
      const curHeadPos = this.headsPos[tapeIdx]
      const nextSymbol = nextSymbols[tapeIdx]
      const move = moves[tapeIdx]
      const nextHeadPos = Math.max(curHeadPos + move, 0)

      // Write new symbol
      tape[curHeadPos] = nextSymbol

      // Handle tape expansion/contraction using Elm-based logic
      const tapeChange = this.calculateTapeChange(nextSymbol, move, curHeadPos, tape)
      
      if (tapeChange === 'grow') {
        tape.push(TM.BLANK)
      } else if (tapeChange === 'shrink') {
        tape.pop()
      }
      // 'same' means no change to tape length

      this.headsPos[tapeIdx] = nextHeadPos
    }

    this.state = nextState

    // Create and return the diff
    const headsPosMove = new Int8Array(this.tm.numTapes)
    const tapesLenDiff = new Int8Array(this.tm.numTapes)
    
    for (let i = 0; i < this.tm.numTapes; i++) {
      headsPosMove[i] = this.headsPos[i] - oldHeadsPos[i]
      tapesLenDiff[i] = this.tapes[i].length - oldTapesLengths[i]
    }

    return new ConfigDiff(oldState, nextState, scannedSymbols, nextSymbols, headsPosMove, tapesLenDiff)
  }

  /**
   * Apply a ConfigDiff to modify this configuration forward in time.
   */
  applyDiff(diff: ConfigDiff): void {
    if (diff.oldState !== this.state) {
      throw new Error(`cannot apply diff to TMConfiguration, before states do not match: config state: ${this.state}, diff.oldState: ${diff.oldState}`)
    }

    for (let tapeIdx = 0; tapeIdx < this.tm.numTapes; tapeIdx++) {
      const tape = this.tapes[tapeIdx]
      const oldHeadPos = this.headsPos[tapeIdx]
      const newHeadPos = oldHeadPos + diff.headsPosMove[tapeIdx]
      const oldSymbol = tape[oldHeadPos]
      
      if (oldSymbol !== diff.oldSymbols[tapeIdx]) {
        throw new Error(`cannot apply diff to TMConfiguration, before scanned symbols do not match: config scanned symbols: ${this.currentScannedSymbols()}, diff.oldSymbols: ${diff.oldSymbols}`)
      }
      
      const newSymbol = diff.newSymbols[tapeIdx]
      const oldTapeLength = this.tapes[tapeIdx].length
      const newTapeLength = oldTapeLength + diff.tapesLenDiff[tapeIdx]

      // Write the new symbol at the old head position
      tape[oldHeadPos] = newSymbol
      
      // Adjust tape length
      if (newTapeLength - oldTapeLength === 1) {
        tape.push(TM.BLANK)
      } else if (newTapeLength - oldTapeLength === -1) {
        tape.pop()
      }
      
      // Move the head
      this.headsPos[tapeIdx] = newHeadPos
    }
    
    this.state = diff.newState
  }

  /**
   * Apply a ConfigDiff in reverse to modify this configuration backward in time.
   */
  applyReverseDiff(diff: ConfigDiff): void {
    if (diff.newState !== this.state) {
      throw new Error(`cannot apply reverse of diff to TMConfiguration, after states do not match: config state: ${this.state}, diff.newState: ${diff.newState}`)
    }

    for (let tapeIdx = 0; tapeIdx < this.tm.numTapes; tapeIdx++) {
      const tape = this.tapes[tapeIdx]
      const newHeadPos = this.headsPos[tapeIdx]
      const oldHeadPos = newHeadPos - diff.headsPosMove[tapeIdx]
      const oldSymbol = diff.oldSymbols[tapeIdx]
      const newTapeLength = this.tapes[tapeIdx].length
      const oldTapeLength = newTapeLength - diff.tapesLenDiff[tapeIdx]

      // Adjust tape length (reverse of forward operation)
      if (newTapeLength - oldTapeLength === 1) {
        tape.pop()
      } else if (newTapeLength - oldTapeLength === -1) {
        tape.push(TM.BLANK)
      }
      
      // Restore the old symbol at the old head position
      tape[oldHeadPos] = oldSymbol
      
      // Move the head back
      this.headsPos[tapeIdx] = oldHeadPos
    }
    
    this.state = diff.oldState
  }

  /**
   * Create a copy with a diff applied.
   */
  applyDiffCopy(diff: ConfigDiff): TMConfiguration {
    const copy = this.copy()
    copy.applyDiff(diff)
    return copy
  }

  /**
   * Create a copy with a diff applied in reverse.
   */
  applyReverseDiffCopy(diff: ConfigDiff): TMConfiguration {
    const copy = this.copy()
    copy.applyReverseDiff(diff)
    return copy
  }

  toString(): string {
    let result = `state: ${this.state}, tapes:`
    for (let i = 0; i < this.headsPos.length; i++) {
      result += '\n'
      const headPos = this.headsPos[i]
      const tape = this.tapes[i]
      for (let j = 0; j < tape.length; j++) {
        if (j !== headPos) {
          result += ' '
        } else {
          result += '>'
        }
        result += tape[j]
      }
    }
    return result
  }

  equals(other: TMConfiguration): boolean {
    if (this.tm !== other.tm) return false
    if (this.state !== other.state) return false
    if (this.headsPos.length !== other.headsPos.length) return false
    
    for (let i = 0; i < this.headsPos.length; i++) {
      if (this.headsPos[i] !== other.headsPos[i]) return false
    }
    
    if (this.tapes.length !== other.tapes.length) return false
    for (let i = 0; i < this.tapes.length; i++) {
      const thisTape = this.tapes[i]
      const otherTape = other.tapes[i]
      if (thisTape.length !== otherTape.length) return false
      for (let j = 0; j < thisTape.length; j++) {
        if (thisTape[j] !== otherTape[j]) return false
      }
    }
    
    return true
  }
}

/**
 * Represents a Turing machine with one-way infinite tapes.
 */
export class TM implements Automaton {
  // Maximum number of steps to run TM
  static readonly MAX_STEPS = 10**6
  
  // Blank symbol; must be in tape_alphabet but not input_alphabet
  static readonly BLANK = '_'

  readonly states: string[]
  readonly inputAlphabet: string[]
  readonly tapeAlphabet: string[]
  readonly startState: string
  readonly acceptState: string
  readonly rejectState: string
  readonly numTapes: number
  
  // Transition function: delta["state,symbols"] = [nextState, newSymbols, moveDirections]
  readonly delta: Record<string, [string, string, string]>
  
  // For performance: track non-wildcard transitions for fast exact matching
  readonly nonWildcardInputSymbols: Map<string, Set<string>> = new Map()

  constructor(
    states: string[],
    inputAlphabet: string[],
    tapeAlphabet: string[],
    startState: string,
    acceptState: string,
    rejectState: string,
    delta: Record<string, Record<string, string[]>>
  ) {
    // Validate constructor arguments
    if (states.length === 0) {
      throw new Error('states cannot be empty')
    }

    if (inputAlphabet.length === 0) {
      throw new Error('input_alphabet cannot be empty')
    }

    if (tapeAlphabet.length === 0) {
      throw new Error('tape_alphabet cannot be empty')
    }

    const tapeAlphabetSet = new Set(tapeAlphabet)
    
    if (tapeAlphabet.length !== tapeAlphabetSet.size) {
      throw new Error('duplicate tape alphabet symbols')
    }

    for (const symbol of inputAlphabet) {
      if (!tapeAlphabetSet.has(symbol)) {
        throw new Error('input_alphabet must be subset of tape_alphabet')
      }
    }

    if (!tapeAlphabetSet.has(TM.BLANK)) {
      throw new Error(`tape_alphabet must contain blank symbol '${TM.BLANK}'`)
    }

    if (inputAlphabet.includes(TM.BLANK)) {
      throw new Error(`input_alphabet cannot contain blank symbol '${TM.BLANK}'`)
    }

    for (const symbol of tapeAlphabet) {
      if (symbol.length !== 1) {
        throw new Error(`alphabet symbols must be length 1, but string '${symbol}' has length ${symbol.length}`)
      }
    }

    for (const symbol of inputAlphabet) {
      if (symbol.length !== 1) {
        throw new Error(`alphabet symbols must be length 1, but string '${symbol}' has length ${symbol.length}`)
      }
      if (symbol === WILDCARD) {
        throw new Error(`input alphabet cannot contain wildcard symbol '${WILDCARD}'`)
      }
    }
    
    for (const symbol of tapeAlphabet) {
      if (symbol === WILDCARD) {
        throw new Error(`tape alphabet cannot contain wildcard symbol '${WILDCARD}'`)
      }
    }

    if (!states.includes(startState)) {
      throw new Error(`start_state "${startState}" not in state list ${setNotation(states)}`)
    }

    if (!states.includes(rejectState)) {
      throw new Error(`reject_state "${rejectState}" not in state list ${setNotation(states)}`)
    }

    if (!states.includes(acceptState)) {
      throw new Error(`accept_state "${acceptState}" not in state list ${setNotation(states)}`)
    }

    // Determine number of tapes from first transition
    const firstState = Object.keys(delta)[0]
    const firstSymbols = firstState ? Object.keys(delta[firstState])[0] : undefined
    if (!firstSymbols) {
      throw new Error('delta must contain at least one transition')
    }
    this.numTapes = firstSymbols.length

    // Validate delta function and build non-wildcard symbol sets
    for (const [state, symbolMap] of Object.entries(delta)) {
      if (!state || state === '') {
        throw new Error('state in delta cannot be null or empty')
      }

      if (!states.includes(state)) {
        throw new Error(`state "${state}" not in state list ${setNotation(states)}`)
      }

      if (state === acceptState) {
        throw new Error(`cannot define transition on accept state ${acceptState}`)
      }

      if (state === rejectState) {
        throw new Error(`cannot define transition on reject state ${rejectState}`)
      }
      
      // Initialize non-wildcard symbol set for this state
      this.nonWildcardInputSymbols.set(state, new Set())

      for (const [symbols, action] of Object.entries(symbolMap)) {
        if (symbols.length !== this.numTapes) {
          throw new Error(`all transitions must use same number of symbols, but transition uses ${symbols.length} symbols while number of tapes is ${this.numTapes}`)
        }

        // Track non-wildcard symbols for performance
        if (!symbols.includes(WILDCARD)) {
          const symbolSet = this.nonWildcardInputSymbols.get(state)
          assert(symbolSet, `Symbol set should exist for state "${state}"`)
          symbolSet.add(symbols)
        }

        for (let i = 0; i < symbols.length; i++) {
          const symbol = symbols[i]
          if (!tapeAlphabetSet.has(symbol) && symbol !== WILDCARD) {
            throw new Error(`symbol "${symbol}" not in tape alphabet ${setNotation(tapeAlphabet)} (nor wildcard ${WILDCARD})`)
          }
        }

        if (action.length !== 3) {
          throw new Error(`must have exactly 3 actions (state,symbol(s),move(s)): the action ${setNotation(action)} has ${action.length}`)
        }

        const [nextState, nextSymbols, moveDirections] = action

        if (!nextState || nextState === '') {
          throw new Error(`delta(${state}, ${symbols}) has null or empty output state`)
        }

        if (!states.includes(nextState)) {
          throw new Error(`transition delta(${state}, ${symbols}) has output state ${nextState} not in state list ${setNotation(states)}`)
        }

        if (nextSymbols.length !== this.numTapes) {
          throw new Error(`transition delta(${state}, ${symbols}) has ${nextSymbols.length} output symbols but number of tapes is ${this.numTapes}`)
        }

        if (moveDirections.length !== this.numTapes) {
          throw new Error(`transition delta(${state}, ${symbols}) has ${moveDirections.length} move directions but number of tapes is ${this.numTapes}`)
        }

        for (let i = 0; i < nextSymbols.length; i++) {
          const nextSymbol = nextSymbols[i]
          if (!tapeAlphabetSet.has(nextSymbol) && nextSymbol !== WILDCARD) {
            throw new Error(`transition delta(${state}, ${symbols}) has output symbol ${nextSymbol} not in tape alphabet ${setNotation(tapeAlphabet)} (nor wildcard ${WILDCARD})`)
          }
          
          // Validate wildcard output constraints
          if (nextSymbol === WILDCARD && symbols[i] !== WILDCARD) {
            throw new Error(`transitions with wildcard ${WILDCARD} as output symbol must have it in same position of input symbols, but transition delta(${state}, ${symbols}) -> ${setNotation(action)} has disagreement at position ${i}`)
          }
        }

        for (let i = 0; i < moveDirections.length; i++) {
          const direction = moveDirections[i]
          if (!(direction === 'L' || direction === 'R' || direction === 'S')) {
            throw new Error(`transition delta(${state}, ${symbols}) has invalid move direction "${direction}"; must be L, R, or S`)
          }
        }
      }
    }

    this.states = [...states]
    this.inputAlphabet = [...inputAlphabet]
    this.tapeAlphabet = [...tapeAlphabet]
    this.startState = startState
    this.acceptState = acceptState
    this.rejectState = rejectState
    
    // Flatten the nested delta format to match DFA/NFA pattern
    const flatDelta: Record<string, [string, string, string]> = {}
    for (const [state, symbolMap] of Object.entries(delta)) {
      for (const [symbols, transition] of Object.entries(symbolMap)) {
        const key = deltaKey(state, symbols)
        flatDelta[key] = [transition[0], transition[1], transition[2]]
      }
    }
    this.delta = flatDelta

    // Check for overlapping wildcard transitions (must be after setting this.delta)
    this.validateWildcardOverlaps()
  }

  /**
   * Validate that wildcard transitions don't overlap ambiguously
   */
  private validateWildcardOverlaps(): void {
    // Group transitions by state from flattened delta
    const stateTransitions = new Map<string, string[]>()
    for (const key of Object.keys(this.delta)) {
      const commaIndex = key.indexOf(',')
      if (commaIndex === -1) continue
      
      const state = key.substring(0, commaIndex)
      const symbols = key.substring(commaIndex + 1)
      
      if (!stateTransitions.has(state)) {
        stateTransitions.set(state, [])
      }
      const transitions = stateTransitions.get(state)
      assert(transitions, `Transitions should exist for state "${state}"`)
      transitions.push(symbols)
    }
    
    // Check each state for overlapping wildcard patterns
    for (const [state, patterns] of stateTransitions.entries()) {
      const wildcardPatterns = patterns.filter(pattern => pattern.includes(WILDCARD))
      
      // Check each pair of wildcard patterns for overlaps
      for (let i = 0; i < wildcardPatterns.length; i++) {
        for (let j = i + 1; j < wildcardPatterns.length; j++) {
          const pattern1 = wildcardPatterns[i]
          const pattern2 = wildcardPatterns[j]
          
          const overlaps = wildcardIntersect(pattern1, pattern2, this.tapeAlphabet)
          
          // Check if any overlap lacks a specific non-wildcard transition
          for (const overlapString of overlaps) {
            if (!this.nonWildcardInputSymbols.get(state)?.has(overlapString)) {
              throw new Error(
                `Overlapping wildcard transitions:\n` +
                `  ${state}, ${pattern1} -> ${this.delta[deltaKey(state, pattern1)].join(', ')}\n` +
                `  ${state}, ${pattern2} -> ${this.delta[deltaKey(state, pattern2)].join(', ')}\n` +
                `Both match symbol sequence "${overlapString}", but there is no more specific ` +
                `non-wildcard transition on state ${state} for "${overlapString}".`
              )
            }
          }
        }
      }
    }
  }

  /**
   * Indicate whether this state is halting.
   */
  isHalting(state: string): boolean {
    return state === this.acceptState || state === this.rejectState
  }

  /**
   * Returns whether the TM accepts the given input string.
   */
  accepts(input: string): boolean {
    checkAgainstInputAlphabet(this.inputAlphabet, input)
    
    const configs = this.configsVisited(input)
    const finalConfig = configs[configs.length - 1]
    return finalConfig.state === this.acceptState
  }

  /**
   * Run the TM on input and return the output string.
   */
  run(input: string): string {
    checkAgainstInputAlphabet(this.inputAlphabet, input)
    
    const configs = this.configsVisited(input)
    const finalConfig = configs[configs.length - 1]
    return finalConfig.outputString()
  }

  /**
   * Returns a list of the states visited by the TM when processing the string x.
   */
  statesVisited(input: string): string[] {
    const configs = this.configsVisited(input)
    return configs.map(config => config.state)
  }

  /**
   * Returns a list of the configurations visited by the TM when processing the string x.
   */
  configsVisited(input: string): TMConfiguration[] {
    checkAgainstInputAlphabet(this.inputAlphabet, input)
    
    const configurations: TMConfiguration[] = []
    configurations.push(this.initialConfig(input))
    
    for (let step = 0; step < TM.MAX_STEPS; step++) {
      const curConfig = configurations[configurations.length - 1]
      if (curConfig.isHalting()) {
        break
      }
      const nextConfig = curConfig.nextConfig()
      configurations.push(nextConfig)
    }
    
    return configurations
  }

  /**
   * Memory-efficient alternative to configsVisited that returns ConfigDiffs and final configuration.
   * Only stores diffs instead of full configurations to save memory.
   */
  getConfigDiffsAndFinalConfig(input: string): { diffs: ConfigDiff[], finalConfig: TMConfiguration } {
    checkAgainstInputAlphabet(this.inputAlphabet, input)
    
    const diffs: ConfigDiff[] = []
    const config = this.initialConfig(input)
    
    for (let step = 0; step < TM.MAX_STEPS; step++) {
      if (config.isHalting()) {
        break
      }
      const diff = config.goToNextConfigWithDiff()
      diffs.push(diff)
    }
    
    return { diffs, finalConfig: config }
  }

  /**
   * Returns just the ConfigDiffs for this input (convenience method).
   */
  getConfigDiffs(input: string): ConfigDiff[] {
    return this.getConfigDiffsAndFinalConfig(input).diffs
  }

  /**
   * Create initial configuration for given input.
   */
  initialConfig(input: string): TMConfiguration {
    const initHeadsPos = new Array(this.numTapes).fill(0)
    const initTapes: string[][] = new Array(this.numTapes)
    
    // First tape gets the input + blank
    initTapes[0] = [...input.split(''), TM.BLANK]
    
    // Other tapes start with just blank
    for (let i = 1; i < this.numTapes; i++) {
      initTapes[i] = [TM.BLANK]
    }
    
    return new TMConfiguration(this, this.startState, initHeadsPos, initTapes)
  }

  /**
   * Get string representation of a single transition.
   */
  transitionStr(state: string, symbols: string): string | null {
    const key = deltaKey(state, symbols)
    const action = this.delta[key]
    if (action) {
      return `${symbols} → ${action.join(' , ')}`
    }
    return null
  }

  /**
   * String representation of the TM.
   */
  toString(): string {
    const parts = [
      `states:         ${this.states.join(',')}`,
      `input_alphabet: ${this.inputAlphabet.join(',')}`,
      `tape_alphabet:  ${this.tapeAlphabet.join(',')}`,
      `start_state:    ${this.startState}`,
      `accept_state:   ${this.acceptState}`,
      `reject_state:   ${this.rejectState}`,
      `delta:          ${this.deltaToString().split('\n').join('\n                ')}`
    ]
    return parts.join('\n')
  }

  /**
   * Returns string representation of the delta function.
   */
  deltaToString(): string {
    const lines: string[] = []
    
    // Calculate maximum width for formatting
    let maxWidth = 0
    for (const state of this.states) {
      for (const symbol of this.tapeAlphabet) {
        const width = `${state},${symbol}`.length
        if (width > maxWidth) {
          maxWidth = width
        }
      }
    }
    
    for (const [key, action] of Object.entries(this.delta)) {
      const stateSymbol = key.padStart(maxWidth)
      lines.push(`${stateSymbol} → ${action.join(',')}`)
    }
    
    return lines.join('\n')
  }

  /**
   * Equality comparison with another TM.
   */
  equals(other: TM): boolean {
    if (this.numTapes !== other.numTapes) return false
    
    // Check basic properties
    if (this.startState !== other.startState ||
        this.acceptState !== other.acceptState ||
        this.rejectState !== other.rejectState) {
      return false
    }

    // Check sets are equal (order independent)
    const thisStatesSet = new Set(this.states)
    const otherStatesSet = new Set(other.states)
    if (thisStatesSet.size !== otherStatesSet.size ||
        !Array.from(thisStatesSet).every(state => otherStatesSet.has(state))) {
      return false
    }

    const thisInputSet = new Set(this.inputAlphabet)
    const otherInputSet = new Set(other.inputAlphabet)
    if (thisInputSet.size !== otherInputSet.size ||
        !Array.from(thisInputSet).every(symbol => otherInputSet.has(symbol))) {
      return false
    }

    const thisTapeSet = new Set(this.tapeAlphabet)
    const otherTapeSet = new Set(other.tapeAlphabet)
    if (thisTapeSet.size !== otherTapeSet.size ||
        !Array.from(thisTapeSet).every(symbol => otherTapeSet.has(symbol))) {
      return false
    }

    // Check delta functions are equal
    const thisKeys = Object.keys(this.delta)
    const otherKeys = Object.keys(other.delta)
    
    if (thisKeys.length !== otherKeys.length) return false
    
    for (const key of thisKeys) {
      const thisAction = this.delta[key]
      const otherAction = other.delta[key]
      
      if (!otherAction) return false
      if (thisAction.length !== otherAction.length) return false
      
      for (let i = 0; i < thisAction.length; i++) {
        if (thisAction[i] !== otherAction[i]) return false
      }
    }

    return true
  }
}