import { describe, test, expect } from 'vitest'
import { NFAParser } from './NFAParser'

describe('NFAParser', () => {
  const parser = new NFAParser()

  // NFA that accepts any string with a 0 three positions from the end
  const nfa0ThreeFromEndYaml = `
states: [q1, q2, q3, q4]
input_alphabet: [0, 1]
start_state: q1
accept_states: [q4]
delta:
  q1:
    0: [q1, q2]
    1: [q1]
  q2:
    0: [q3]
    1: [q3]
  q3:
    0: [q4]
    1: [q4]
`

  // NFA that accepts either "010" or "101" using epsilon transitions
  const nfa010or101Yaml = `
states: [start, start010, s0, s01, s010, start101, s1, s10, s101]
input_alphabet: [0, 1]
start_state: start
accept_states: [s010, s101]
delta:
  start:
    "": [start010, start101]
  start010:
    0: [s0]
  s0:
    1: [s01]
  s01:
    0: [s010]
  start101:
    1: [s1]
  s1:
    0: [s10]
  s10:
    1: [s101]
`

  // NFA with only epsilon transitions
  const nfaEpsilonEndYaml = `
states: [start, middle, end]
input_alphabet: [0, 1]
start_state: start
accept_states: [end]
delta:
  start:
    "": [middle]
  middle:
    "": [end]
`

  // NFA with multiple transitions on same input (excess transitions allowed)
  const nfaExcessTransitionsYaml = `
states: [a, b]
input_alphabet: [0, 1]
start_state: a
accept_states: [b]
delta:
  a:
    0: [b, a]
    1: [a]
`

  describe('Valid YAML parsing', () => {
    test('parses NFA with multiple target states', () => {
      const nfa = parser.parseNFA(nfa0ThreeFromEndYaml)
      expect(nfa).toBeDefined()
      expect(nfa.accepts('000')).toBe(true)
      expect(nfa.accepts('0011001')).toBe(true)
      expect(nfa.accepts('0011101')).toBe(false)
    })

    test('parses NFA with epsilon transitions', () => {
      const nfa = parser.parseNFA(nfa010or101Yaml)
      expect(nfa).toBeDefined()
      expect(nfa.accepts('010')).toBe(true)
      expect(nfa.accepts('101')).toBe(true)
      expect(nfa.accepts('000')).toBe(false)
      expect(nfa.accepts('0101')).toBe(false)
    })

    test('parses NFA with only epsilon transitions', () => {
      const nfa = parser.parseNFA(nfaEpsilonEndYaml)
      expect(nfa).toBeDefined()
      expect(nfa.accepts('')).toBe(true)
      expect(nfa.accepts('0')).toBe(false)
    })

    test('parses NFA with excess transitions (multiple targets)', () => {
      const nfa = parser.parseNFA(nfaExcessTransitionsYaml)
      expect(nfa).toBeDefined()
      expect(nfa.accepts('')).toBe(false)
      expect(nfa.accepts('0')).toBe(true)
      expect(nfa.accepts('1')).toBe(false)
      expect(nfa.accepts('00')).toBe(true)
      expect(nfa.accepts('10')).toBe(true)
      expect(nfa.accepts('100')).toBe(true)
      expect(nfa.accepts('110')).toBe(true)
    })
  })

  describe('YAML syntax errors', () => {
    test('throws on invalid YAML syntax', () => {
      const invalidYaml = `
states: [q0, q1
input_alphabet: [0, 1]
`
      expect(() => parser.parseNFA(invalidYaml))
        .toThrow(/YAML syntax error/)
    })

    test('throws on malformed YAML', () => {
      const malformedYaml = `
states: [q0, q1]
input_alphabet: [0, 1
start_state: q0
`
      expect(() => parser.parseNFA(malformedYaml))
        .toThrow(/YAML syntax error/)
    })
  })

  describe('Schema validation errors', () => {
    test('throws on missing required fields', () => {
      const missingStates = `
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta: {}
`
      expect(() => parser.parseNFA(missingStates))
        .toThrow(/Missing required field/)
    })

    test('throws on empty states array', () => {
      const emptyStates = `
states: []
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta: {}
`
      expect(() => parser.parseNFA(emptyStates))
        .toThrow(/at least one state/)
    })

    test('throws on multi-character alphabet symbols', () => {
      const multiCharAlphabet = `
states: [q0]
input_alphabet: [ab, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    ab: [q0]
    1: [q0]
`
      expect(() => parser.parseNFA(multiCharAlphabet))
        .toThrow(/Symbol "ab" is too long/)
    })

    test('throws on duplicate states', () => {
      const duplicateStates = `
states: [q0, q1, q0]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(duplicateStates))
        .toThrow(/unique|duplicate/)
    })

    test('allows numeric state names', () => {
      const numericStateName = `
states: [q0, "123", q2]
input_alphabet: [0, 1]
start_state: q0
accept_states: ["123"]
delta:
  q0:
    0: ["123"]
    1: [q2]
`
      const nfa = parser.parseNFA(numericStateName)
      expect(nfa.states).toContain('123')
      expect(nfa.accepts('0')).toBe(true) // q0 -> 123 (accept)
    })
  })

  describe('Semantic validation errors', () => {
    test('throws on start_state not in states', () => {
      const invalidStartState = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q2
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(invalidStartState))
        .toThrow(/Invalid value "q2" - must be one of:/)
    })

    test('throws on accept_state not in states', () => {
      const invalidAcceptState = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0, q2]
delta:
  q0:
    0: [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(invalidAcceptState))
        .toThrow(/Invalid value "q2" - must be one of:/)
    })

    test('throws on transition from unknown state', () => {
      const unknownSourceState = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
  q2:
    0: [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(unknownSourceState))
        .toThrow(/Transition from unknown state "q2"/)
    })

    test('throws on transition to unknown state', () => {
      const unknownTargetState = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q2]
`
      expect(() => parser.parseNFA(unknownTargetState))
        .toThrow(/transition target state must be one of the defined states/)
    })

    test('throws on transition with unknown symbol', () => {
      const unknownSymbol = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
    2: [q1]
`
      expect(() => parser.parseNFA(unknownSymbol))
        .toThrow(/Transition with unknown symbol "2"/)
    })

    test('accepts both single and array delta targets', () => {
      const mixedTargets = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q1]
delta:
  q0:
    0: q1               # single target (DFA syntax)
    1: [q0]             # array target (NFA syntax)
  q1:
    0: [q0, q1]         # multiple targets (NFA syntax)
    1: q1               # single target (DFA syntax)
`
      const nfa = parser.parseNFA(mixedTargets)
      expect(nfa).toBeDefined()
      expect(nfa.accepts('0')).toBe(true)
      expect(nfa.accepts('1')).toBe(false)
    })
  })

  describe('NFA-specific features', () => {
    test('handles epsilon transitions correctly', () => {
      const nfa = parser.parseNFA(nfaEpsilonEndYaml)
      
      // Should accept empty string due to epsilon transitions
      expect(nfa.accepts('')).toBe(true)
      
      // Should reject any non-empty string since no regular transitions defined
      expect(nfa.accepts('0')).toBe(false)
      expect(nfa.accepts('1')).toBe(false)
    })

    test('handles multiple target states correctly', () => {
      const nfa = parser.parseNFA(nfa0ThreeFromEndYaml)
      
      // Test various strings with 0 three from end
      expect(nfa.accepts('000')).toBe(true)      // exactly 3 from end
      expect(nfa.accepts('1000')).toBe(true)     // 0 is 3 from end
      expect(nfa.accepts('0011001')).toBe(true)  // 0 is 3 from end
      expect(nfa.accepts('0011101')).toBe(false) // no 0 three from end
      expect(nfa.accepts('')).toBe(false)        // empty string
    })

    test('validates epsilon transition symbol in schema', () => {
      const validEpsilonNFA = `
states: [q0, q1]
input_alphabet: [a]
start_state: q0
accept_states: [q1]
delta:
  q0:
    "": [q1]
    a: [q0]
`
      expect(() => parser.parseNFA(validEpsilonNFA)).not.toThrow()
    })
  })

  describe('Edge cases', () => {
    test('handles single state NFA', () => {
      const singleStateNFA = `
states: [q0]
input_alphabet: [0]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
`
      const nfa = parser.parseNFA(singleStateNFA)
      expect(nfa.accepts('0')).toBe(true)
      expect(nfa.accepts('00')).toBe(true)
      expect(nfa.accepts('')).toBe(true)
    })

    test('handles NFA with no accept states', () => {
      const noAcceptStates = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: []
delta:
  q0:
    0: [q1]
    1: [q0]
  q1:
    0: [q0] 
    1: [q1]
`
      const nfa = parser.parseNFA(noAcceptStates)
      expect(nfa.accepts('')).toBe(false)
      expect(nfa.accepts('0')).toBe(false)
      expect(nfa.accepts('1')).toBe(false)
    })

    test('handles empty target arrays', () => {
      const emptyTargets = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q1]
delta:
  q0:
    0: []
    1: [q1]
  q1:
    0: [q1]
    1: []
`
      const nfa = parser.parseNFA(emptyTargets)
      expect(nfa.accepts('1')).toBe(true)
      expect(nfa.accepts('0')).toBe(false)
      expect(nfa.accepts('01')).toBe(false)
    })
  })

  describe('Additional schema validation errors', () => {
    test('throws on duplicate symbols in input_alphabet', () => {
      const duplicateSymbols = `
states: [q0, q1]
input_alphabet: [0, 1, 2, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
    2: [q1]
`
      expect(() => parser.parseNFA(duplicateSymbols))
        .toThrow(/unique|duplicate/)
    })

    test('throws on accept_states without brackets (not an array)', () => {
      const invalidAcceptStates = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: q0, q1
delta:
  q0:
    0: [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(invalidAcceptStates))
        .toThrow(/must be array/)
    })

    test('throws on empty string in input_alphabet', () => {
      const emptyStringAlphabet = `
states: [q0, q1]
input_alphabet: ['', 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    '': [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(emptyStringAlphabet))
        .toThrow(/exactly one character/)
    })

    test('throws on states without brackets (not an array)', () => {
      const invalidStates = `
states: q0, q1
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(invalidStates))
        .toThrow(/must be array/)
    })

    test('throws on input_alphabet without brackets (not an array)', () => {
      const invalidAlphabet = `
states: [q0, q1]
input_alphabet: 0, 1
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(invalidAlphabet))
        .toThrow(/must be array/)
    })

    test('throws on extra unexpected property', () => {
      const extraProperty = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
unexpected_property: "This should not be here"
delta:
  q0:
    0: [q0]
    1: [q1]
`
      expect(() => parser.parseNFA(extraProperty))
        .toThrow(/Unexpected property/)
    })

    test('throws on delta is null', () => {
      const nullDelta = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta: null
`
      expect(() => parser.parseNFA(nullDelta))
        .toThrow(/must be an object/)
    })

    test('throws on duplicate top-level keys', () => {
      const duplicateTopLevel = `
states: [q0, q1]
input_alphabet: [a, b]
start_state: q0
start_state: q1
accept_states: [q1]
delta:
  q0:
    a: [q0, q1]
    b: [q0]
  q1:
    a: [q1]
    b: [q1]
`
      expect(() => parser.parseNFA(duplicateTopLevel))
        .toThrow(/Map keys must be unique/)
    })

    test('throws on duplicate state keys in delta', () => {
      const duplicateStateKeys = `
states: [q0, q1]
input_alphabet: [a, b]
start_state: q0
accept_states: [q1]
delta:
  q0:
    a: [q0, q1]
    b: [q0]
  q0:
    a: [q1]
    b: [q1]
`
      expect(() => parser.parseNFA(duplicateStateKeys))
        .toThrow(/Map keys must be unique/)
    })

    test('throws on duplicate transition keys within state', () => {
      const duplicateTransitionKeys = `
states: [q0, q1]
input_alphabet: [a, b]
start_state: q0
accept_states: [q1]
delta:
  q0:
    a: [q0, q1]
    b: [q0]
    a: [q1]
  q1:
    a: [q1]
    b: [q1]
`
      expect(() => parser.parseNFA(duplicateTransitionKeys))
        .toThrow(/Map keys must be unique/)
    })
  })
})