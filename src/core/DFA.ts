/**
 * Represents a deterministic finite automaton, with accept states for
 * accepting/rejecting strings over a finite alphabet.
 * 
 * Based on the Dart implementation by Dave Doty.
 * Excludes parsing functionality - YAML parsing will be handled separately.
 */

import { setNotation, checkAgainstInputAlphabet, deltaKey } from './Utils'
import type { Automaton } from './Automaton'

export class DFA implements Automaton {
  readonly states: string[]
  readonly inputAlphabet: string[]
  readonly startState: string
  readonly acceptStates: string[]
  readonly delta: Record<string, string> // Flattened: "state,symbol" -> target_state

  constructor(
    states: string[], 
    inputAlphabet: string[], 
    startState: string, 
    acceptStates: string[],
    delta: Record<string, Record<string, string>>
  ) {
    // Validate input alphabet - symbols must be single characters
    for (const ch of inputAlphabet) {
      if (ch.length !== 1) {
        throw new Error("Input alphabet symbols must be single characters")
      }
    }

    // Validate non-empty sets
    if (states.length === 0) {
      throw new Error("State set cannot be empty")
    }
    if (inputAlphabet.length === 0) {
      throw new Error("Input alphabet cannot be empty")
    }

    // Check for duplicates
    if (states.length !== new Set(states).size) {
      throw new Error("duplicate states")
    }
    if (inputAlphabet.length !== new Set(inputAlphabet).size) {
      throw new Error("duplicate input alphabet symbols")
    }

    // Validate start state is in state set
    if (!states.includes(startState)) {
      throw new Error(`Start state ${startState} not in state set`)
    }

    // Validate accept states are in state set
    const stateSet = new Set(states)
    for (const acceptState of acceptStates) {
      if (!stateSet.has(acceptState)) {
        throw new Error(`Accept state ${acceptState} not in state set`)
      }
    }

    // Check for duplicate accept states
    if (acceptStates.length !== new Set(acceptStates).size) {
      throw new Error("duplicate accept states")
    }

    // Convert 2D delta format to flat format and validate
    const flatDelta: Record<string, string> = {}
    for (const [state, symbolMap] of Object.entries(delta)) {
      if (!states.includes(state)) {
        throw new Error(`state ${state} not in state list ${setNotation(states)}`)
      }
      
      for (const [symbol, nextState] of Object.entries(symbolMap)) {
        if (!inputAlphabet.includes(symbol)) {
          throw new Error(`symbol ${symbol} not in alphabet ${setNotation(inputAlphabet)}`)
        }
        if (!states.includes(nextState)) {
          throw new Error(`next state ${nextState} not in state list ${setNotation(states)}`)
        }
        
        // Store in flat format
        flatDelta[deltaKey(state, symbol)] = nextState
      }
    }

    // Ensure delta is total - defined for all state-symbol pairs
    const missingTransitions: string[][] = []
    for (const state of states) {
      for (const ch of inputAlphabet) {
        if (flatDelta[deltaKey(state, ch)] === undefined) {
          missingTransitions.push([state, ch])
        }
      }
    }
    if (missingTransitions.length > 0) {
      throw new Error(`transition function delta is not total; delta must define a value for each pair ( state , input alphabet symbol )
      the following inputs are not defined:
${missingTransitions.map(pair => pair.join(',')).join('\n')}`)
    }

    this.states = states
    this.inputAlphabet = inputAlphabet
    this.startState = startState
    this.acceptStates = acceptStates
    this.delta = flatDelta
  }


  /**
   * Tests whether the DFA accepts the given input string.
   * Main logic: check if the last state in statesVisited is an accept state.
   */
  accepts(input: string): boolean {
    const visited = this.statesVisited(input)
    const lastState = visited[visited.length - 1]
    return this.acceptStates.includes(lastState)
  }

  /**
   * Returns the sequence of states visited while processing the input string.
   * This contains the main transition logic of the DFA.
   */
  statesVisited(x: string): string[] {
    checkAgainstInputAlphabet(this.inputAlphabet, x)
    
    const statesVisited: string[] = []
    statesVisited.push(this.startState)
    
    // Process each character in the input string
    for (let i = 0; i < x.length; i++) {
      const ch = x[i]
      const currentState = statesVisited[statesVisited.length - 1]
      const nextState = this.delta[deltaKey(currentState, ch)]
      statesVisited.push(nextState)
    }
    
    return statesVisited
  }

  /**
   * Indicates whether a transition is defined on this state and symbol
   */
  transitionDefined(state: string, inSymbol: string): boolean {
    return this.delta[deltaKey(state, inSymbol)] !== undefined
  }

  /**
   * Creates string representation of transition out of this state on input symbol
   * (e.g., '0 → B')
   */
  transitionStr(state: string, inSymbol: string): string {
    if (!(inSymbol.length === 1 && this.inputAlphabet.includes(inSymbol))) {
      throw new Error(`"${inSymbol}" is not contained in input alphabet ${this.inputAlphabet}`)
    }
    const targetState = this.delta[deltaKey(state, inSymbol)]
    return `${inSymbol} → ${targetState}`
  }

  /**
   * String representation of the DFA
   */
  toString(): string {
    let out = ""
    out += "states:          " + this.states.join(',') + '\n'
    out += "input_alphabet:  " + this.inputAlphabet.join(',') + '\n'
    out += "start_state:     " + this.startState + '\n'
    out += "accept_states:   " + this.acceptStates.join(',') + '\n'
    
    // Add delta representation
    this.deltaToString(out, 17)
    return out
  }

  private deltaToString(out: string, startWidth: number): string {
    // Calculate maximum width for formatting
    let maxWidth = 0
    for (const state of this.states) {
      for (const ch of this.inputAlphabet) {
        const width = (state + ',' + ch).length
        if (maxWidth < width) {
          maxWidth = width
        }
      }
    }

    out += "delta:".padEnd(startWidth)
    let firstDone = false
    for (const state of this.states) {
      for (const ch of this.inputAlphabet) {
        if (firstDone) {
          out += " ".repeat(startWidth)
        }
        out += `${state},${ch}`.padStart(maxWidth) + ` -> ${this.delta[deltaKey(state, ch)]}\n`
        firstDone = true
      }
    }
    return out
  }

  /**
   * Equality comparison with another DFA
   */
  equals(other: DFA): boolean {
    if (!other) return false
    
    const setsEqual = (a: string[], b: string[]) => {
      const setA = new Set(a)
      const setB = new Set(b)
      return setA.size === setB.size && Array.from(setA).every(item => setB.has(item))
    }

    // Check basic automaton properties
    if (!setsEqual(this.states, other.states) ||
        !setsEqual(this.inputAlphabet, other.inputAlphabet) ||
        this.startState !== other.startState ||
        !setsEqual(this.acceptStates, other.acceptStates)) {
      return false
    }

    // Check delta function equality
    for (const state of this.states) {
      for (const ch of this.inputAlphabet) {
        const key = deltaKey(state, ch)
        if (this.delta[key] !== other.delta[key]) {
          return false
        }
      }
    }
    
    return true
  }
}