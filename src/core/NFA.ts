import { setNotation, checkAgainstInputAlphabet, deltaKey, assert } from './Utils'

/**
 * Represents a nondeterministic finite automaton, with accept states for
 * accepting/rejecting strings over a finite alphabet.
 * 
 * Based on the Dart NFA implementation from automata-dart/lib/src/NFA.dart
 */
export class NFA {
  readonly states: string[]
  readonly inputAlphabet: string[]
  readonly startState: string
  readonly acceptStates: string[]
  
  // Internal flattened representation: Record<string, string[]> 
  // Keys: "state,symbol" or "state," for epsilon transitions
  // Values: array of target states
  readonly delta: Record<string, string[]>

  constructor(
    states: string[],
    inputAlphabet: string[],
    startState: string,
    acceptStates: string[],
    deltaInput: Record<string, Record<string, string[]>>
  ) {
    // Validate constructor arguments similar to Dart implementation
    if (states.length === 0) {
      throw new Error(`states cannot be empty`)
    }

    if (inputAlphabet.length === 0) {
      throw new Error(`input_alphabet cannot be empty`)
    }

    // Check for multi-character symbols in input alphabet
    for (const symbol of inputAlphabet) {
      if (symbol.length !== 1) {
        throw new Error(`Each symbol in input_alphabet must be exactly one character, got: "${symbol}"`)
      }
    }

    if (!states.includes(startState)) {
      throw new Error(`start_state "${startState}" not in state list ${setNotation(states)}`)
    }

    for (const acceptState of acceptStates) {
      if (!states.includes(acceptState)) {
        throw new Error(`accept_state "${acceptState}" not in state list ${setNotation(states)}`)
      }
    }

    // Validate delta function
    for (const [state, symbolMap] of Object.entries(deltaInput)) {
      if (!states.includes(state)) {
        throw new Error(`state "${state}" not in state list ${setNotation(states)}`)
      }

      for (const [symbol, nextStates] of Object.entries(symbolMap)) {
        // Allow epsilon transitions (empty string) or symbols in input alphabet
        if (symbol !== '' && !inputAlphabet.includes(symbol)) {
          throw new Error(`symbol "${symbol}" not in alphabet ${setNotation(inputAlphabet)}`)
        }

        // Check that all target states are valid
        for (const nextState of nextStates) {
          if (!states.includes(nextState)) {
            throw new Error(`next state "${nextState}" not in state set ${setNotation(states)}`)
          }
        }
      }
    }

    this.states = [...states]
    this.inputAlphabet = [...inputAlphabet]
    this.startState = startState
    this.acceptStates = [...acceptStates]

    // Convert 2D input format to flattened internal format
    this.delta = {}
    for (const [state, symbolMap] of Object.entries(deltaInput)) {
      for (const [symbol, nextStates] of Object.entries(symbolMap)) {
        const key = deltaKey(state, symbol)
        this.delta[key] = [...nextStates]
      }
    }
  }

  /**
   * Determines whether the NFA accepts the given input string
   */
  accepts(input: string): boolean {
    checkAgainstInputAlphabet(this.inputAlphabet, input)
    
    const stateSetsVisited = this.stateSetsVisited(input)
    const finalStates = stateSetsVisited[stateSetsVisited.length - 1]
    
    // Accept if any final state is an accept state
    return finalStates.some(state => this.acceptStates.includes(state))
  }

  /**
   * Returns a list of sets of states visited by the NFA when processing the
   * string x. At each step, the set of states is the set of states reachable
   * from the start, including epsilon closures.
   */
  stateSetsVisited(input: string): string[][] {
    checkAgainstInputAlphabet(this.inputAlphabet, input)
    
    const stateSetsVisited: string[][] = []
    
    // Start with epsilon closure of start state
    const initialStates = this.epsilonClosure(new Set([this.startState]))
    stateSetsVisited.push(Array.from(initialStates).sort())
    
    for (let i = 0; i < input.length; i++) {
      const symbol = input[i]
      const currentStates = new Set(stateSetsVisited[stateSetsVisited.length - 1])
      const nextStates = new Set<string>()
      
      // For each current state, find transitions on this symbol
      for (const state of currentStates) {
        const key = deltaKey(state, symbol)
        const targets = this.delta[key]
        if (targets) {
          targets.forEach(target => nextStates.add(target))
        }
      }
      
      // Apply epsilon closure to the resulting states
      const nextStatesWithEpsilon = this.epsilonClosure(nextStates)
      stateSetsVisited.push(Array.from(nextStatesWithEpsilon).sort())
    }
    
    return stateSetsVisited
  }

  /**
   * Starting at states in statesList, find all those states reachable by
   * traversing epsilon-transitions in a breadth-first search
   * (including the states in statesList).
   */
  private epsilonClosure(statesList: Set<string>): Set<string> {
    const statesVisited = new Set<string>()
    const queue: string[] = Array.from(statesList)
    
    while (queue.length > 0) {
      const state = queue.shift()
      assert(state !== undefined, 'State should not be undefined')
      if (!statesVisited.has(state)) {
        statesVisited.add(state)
        
        // Look for epsilon transitions from this state
        const epsilonKey = deltaKey(state, '')
        const nextStates = this.delta[epsilonKey]
        if (nextStates) {
          for (const nextState of nextStates) {
            queue.push(nextState)
          }
        }
      }
    }
    
    return statesVisited
  }

  /**
   * Creates string representation of transition from this state on this symbol
   * (e.g., '0 -> {B,A}', '1 -> A', 'ε -> C').
   */
  transitionStr(state: string, symbol: string): string | null {
    if (symbol !== '' && (symbol.length !== 1 || !this.inputAlphabet.includes(symbol))) {
      throw new Error(`"${symbol}" is not contained in input alphabet ${this.inputAlphabet}`)
    }
    
    const key = deltaKey(state, symbol)
    const targets = this.delta[key]
    if (targets && targets.length > 0) {
      const displaySymbol = symbol.length > 0 ? symbol : 'ε'
      return `${displaySymbol} → ${setNotation(targets)}`
    }
    return null
  }

  /**
   * Indicates whether a transition is defined on this state and symbol
   */
  transitionDefined(state: string, symbol: string): boolean {
    const key = deltaKey(state, symbol)
    const targets = this.delta[key]
    return targets !== undefined && targets.length > 0
  }

  /**
   * Returns string representation of the delta function
   */
  deltaToString(): string {
    const lines: string[] = []
    
    // Calculate maximum width for formatting
    let maxWidth = 0
    for (const state of this.states) {
      for (const symbol of [...this.inputAlphabet, '']) {
        const width = `${state},${symbol}`.length
        if (width > maxWidth) {
          maxWidth = width
        }
      }
    }
    
    for (const state of this.states) {
      for (const symbol of [...this.inputAlphabet, '']) {
        const key = deltaKey(state, symbol)
        const targets = this.delta[key]
        if (targets && targets.length > 0) {
          const displaySymbol = symbol || 'ε'
          const stateSymbol = `${state},${displaySymbol}`.padStart(maxWidth)
          lines.push(`${stateSymbol} → ${targets.join(',')}`)
        }
      }
    }
    
    return lines.join('\n')
  }

  /**
   * String representation of the NFA
   */
  toString(): string {
    const parts = [
      `states:         ${setNotation(this.states)}`,
      `input_alphabet: ${setNotation(this.inputAlphabet)}`,
      `start_state:    ${this.startState}`,
      `accept_states:  ${setNotation(this.acceptStates)}`,
      `delta:          ${this.deltaToString().split('\n').join('\n                ')}`
    ]
    return parts.join('\n')
  }

  /**
   * Equality comparison with another NFA
   */
  equals(other: NFA): boolean {
    if (this.states.length !== other.states.length ||
        this.inputAlphabet.length !== other.inputAlphabet.length ||
        this.acceptStates.length !== other.acceptStates.length) {
      return false
    }

    if (this.startState !== other.startState) {
      return false
    }

    // Check state sets are equal (order independent)
    const thisStatesSet = new Set(this.states)
    const otherStatesSet = new Set(other.states)
    if (thisStatesSet.size !== otherStatesSet.size ||
        !Array.from(thisStatesSet).every(state => otherStatesSet.has(state))) {
      return false
    }

    // Check input alphabets are equal (order independent)
    const thisAlphabetSet = new Set(this.inputAlphabet)
    const otherAlphabetSet = new Set(other.inputAlphabet)
    if (thisAlphabetSet.size !== otherAlphabetSet.size ||
        !Array.from(thisAlphabetSet).every(symbol => otherAlphabetSet.has(symbol))) {
      return false
    }

    // Check accept states are equal (order independent)
    const thisAcceptSet = new Set(this.acceptStates)
    const otherAcceptSet = new Set(other.acceptStates)
    if (thisAcceptSet.size !== otherAcceptSet.size ||
        !Array.from(thisAcceptSet).every(state => otherAcceptSet.has(state))) {
      return false
    }

    // Check delta functions are equal
    for (const state of this.states) {
      for (const symbol of [...this.inputAlphabet, '']) {
        const thisKey = deltaKey(state, symbol)
        const otherKey = deltaKey(state, symbol)
        const thisTargets = this.delta[thisKey] || []
        const otherTargets = other.delta[otherKey] || []
        
        if (thisTargets.length !== otherTargets.length) {
          return false
        }
        
        const thisTargetSet = new Set(thisTargets)
        const otherTargetSet = new Set(otherTargets)
        if (!Array.from(thisTargetSet).every(target => otherTargetSet.has(target))) {
          return false
        }
      }
    }

    return true
  }
}