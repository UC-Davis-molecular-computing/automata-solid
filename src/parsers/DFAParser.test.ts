import { describe, test, expect } from 'vitest'
import { DFAParser } from './DFAParser'

describe('DFAParser', () => {
  const parser = new DFAParser()

  const validDFAYaml = `
states: [q0, q1, q2]   # ensure comments are ignored
input_alphabet: [0, 1]
start_state: q0
accept_states: [q2]
delta:
  q0:
    0: q1
    1: q0
  q1:
    0: q2
    1: q0
  q2:
    0: q2
    1: q2
`

  const dfa000EndYaml = `
states: [start, q0, q00, q000]
input_alphabet: [0, 1]
start_state: start
accept_states: [q000]
delta:
  start:
    0: q0
    1: start
  q0:
    0: q00
    1: start
  q00:
    0: q000
    1: start
  q000:
    0: q000
    1: start
`

  describe('Valid YAML parsing', () => {
    test('parses valid DFA YAML', () => {
      const dfa = parser.parseDFA(validDFAYaml)
      expect(dfa).toBeDefined()
      expect(dfa.accepts('00')).toBe(true)
      expect(dfa.accepts('01')).toBe(false)
    })

    test('parses DFA with identifier state names', () => {
      const dfa = parser.parseDFA(dfa000EndYaml)
      expect(dfa).toBeDefined()
      expect(dfa.accepts('000')).toBe(true)
      expect(dfa.accepts('0011000')).toBe(true)
      expect(dfa.accepts('00110001')).toBe(false)
    })

    test('creates DFA that matches expected behavior', () => {
      const dfa = parser.parseDFA(validDFAYaml)
      
      // Test state transitions
      expect(dfa.statesVisited('00')).toEqual(['q0', 'q1', 'q2'])
      expect(dfa.statesVisited('01')).toEqual(['q0', 'q1', 'q0'])
      expect(dfa.statesVisited('11')).toEqual(['q0', 'q0', 'q0'])
    })
  })

  describe('YAML syntax errors', () => {
    test('throws on invalid YAML syntax', () => {
      const invalidYaml = `
states: [q0, q1
input_alphabet: [0, 1]
`
      expect(() => parser.parseDFA(invalidYaml))
        .toThrow(/YAML syntax error/)
    })

    test('throws on malformed YAML', () => {
      const malformedYaml = `
states: [q0, q1]
input_alphabet: [0, 1
start_state: q0
`
      expect(() => parser.parseDFA(malformedYaml))
        .toThrow(/YAML syntax error/)
    })
  })

  describe('Schema validation errors', () => {
    test('throws on missing required fields', () => {
      const missingStates = `
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: q0
    1: q0
`
      expect(() => parser.parseDFA(missingStates))
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
      expect(() => parser.parseDFA(emptyStates))
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
    ab: q0
    1: q0
`
      expect(() => parser.parseDFA(multiCharAlphabet))
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
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(duplicateStates))
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
    0: "123"
    1: q2
  "123":
    0: q2
    1: q0
  q2:
    0: q0
    1: q2
`
      const dfa = parser.parseDFA(numericStateName)
      expect(dfa.states).toContain('123')
      expect(dfa.accepts('0')).toBe(true) // q0 -> 123 (accept)
    })

    test('throws on duplicate symbols in input_alphabet', () => {
      const duplicateSymbols = `
states: [q0, q1]
input_alphabet: [0, 1, 2, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: q0
    1: q1
    2: q1
  q1:
    0: q0
    1: q1
    2: q1
`
      expect(() => parser.parseDFA(duplicateSymbols))
        .toThrow(/unique|duplicate/)
    })

    test('KNOWN ISSUE: YAML number conversion of leading zeros creates confusing behavior', () => {
      const yamlWithLeadingZeros = `
states: [q0, q1]
input_alphabet: [00, 1]  # 00 gets converted to 0 by YAML parser
start_state: q0
accept_states: [q1]
delta:
  q0:
    0: q1
    1: q1
  q1:
    0: q1
    1: q1
`
      // This doesn't throw because YAML converts 00 -> 0 before our parser sees it
      // User can avoid this by quoting: input_alphabet: ["00", "1"]
      const dfa = parser.parseDFA(yamlWithLeadingZeros)
      expect(dfa.inputAlphabet).toEqual(['0', '1']) // Not ['00', '1'] as might be expected
    })

    test('KNOWN ISSUE: YAML octal-like number conversion creates duplicate detection', () => {
      const yamlWithOctalLike = `
states: [q0, q1]
input_alphabet: [01, 1]  # 01 gets converted to 1, creating duplicate that IS detected
start_state: q0
accept_states: [q1]
delta:
  q0:
    1: q1
  q1:
    1: q1
`
      // This DOES throw because YAML converts 01 -> 1, creating actual duplicate ['1', '1']
      // which our uniqueness validation catches
      expect(() => parser.parseDFA(yamlWithOctalLike)).toThrow(/unique|duplicate/)
    })

    test('allows state names starting with digits', () => {
      const validStateName = `
states: [q0, "0valid", q2]
input_alphabet: [0, 1]
start_state: q0
accept_states: ["0valid"]
delta:
  q0:
    0: "0valid"
    1: q2
  "0valid":
    0: q2
    1: q0
  q2:
    0: q0
    1: q2
`
      const dfa = parser.parseDFA(validStateName)
      expect(dfa.states).toContain('0valid')
      expect(dfa.accepts('0')).toBe(true) // q0 -> 0valid (accept)
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
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(invalidStartState))
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
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(invalidAcceptState))
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
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
  q2:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(unknownSourceState))
        .toThrow(/Transition from unknown state/)
    })

    test('throws on transition to unknown state', () => {
      const unknownTargetState = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: q0
    1: q1
  q1:
    0: q2
    1: q1
`
      expect(() => parser.parseDFA(unknownTargetState))
        .toThrow(/Transition to unknown state/)
    })

    test('throws on transition with unknown symbol', () => {
      const unknownSymbol = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: q0
    1: q1
    2: q1
  q1:
    0: q0
    1: q1
    2: q1
`
      expect(() => parser.parseDFA(unknownSymbol))
        .toThrow(/Transition with unknown symbol.*must be one of the defined input symbols/)
    })

    test('throws on incomplete transition function', () => {
      const incompleteTransitions = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: q0
    1: q1
  q1:
    0: q0
    # Missing transition for q1 on symbol 1
`
      expect(() => parser.parseDFA(incompleteTransitions))
        .toThrow(/transition function delta is not total|missing transition/)
    })

    test('throws on accept_states without brackets (not an array)', () => {
      const invalidAcceptStates = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: q0, q1
delta:
  q0:
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(invalidAcceptStates))
        .toThrow(/must be array/)
    })

    test('throws on start_state as multi-element array (invalid)', () => {
      const invalidStartState = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: [q0, q1]
accept_states: [q0]
delta:
  q0:
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(invalidStartState))
        .toThrow(/Start state must be a single state name/)
    })

    test('throws on empty string in input_alphabet', () => {
      const emptyStringAlphabet = `
states: [q0, q1]
input_alphabet: ["", "1"]
start_state: q0
accept_states: [q0]
delta:
  q0:
    "": q0
    "1": q1
  q1:
    "": q0
    "1": q1
`
      expect(() => parser.parseDFA(emptyStringAlphabet))
        .toThrow(/Each input symbol must be exactly one character/)
    })

    test('throws on states without brackets (not an array)', () => {
      const invalidStates = `
states: q0, q1
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(invalidStates))
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
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(invalidAlphabet))
        .toThrow(/must be array/)
    })


    test('throws on non-string in input_alphabet', () => {
      const nonStringAlphabet = `
states: [q0, q1]
input_alphabet: [0, 123]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: q0
    123: q1
  q1:
    0: q0
    123: q1
`
      expect(() => parser.parseDFA(nonStringAlphabet))
        .toThrow(/Symbol "123" is too long/)
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
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(extraProperty))
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
      expect(() => parser.parseDFA(nullDelta))
        .toThrow(/must be an object/)
    })

    test('throws on duplicate top-level keys', () => {
      const duplicateTopLevel = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
start_state: q1
accept_states: [q1]
delta:
  q0:
    0: q0
    1: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(duplicateTopLevel))
        .toThrow(/Map keys must be unique/)
    })

    test('throws on duplicate state keys in delta', () => {
      const duplicateStateKeys = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q1]
delta:
  q0:
    0: q0
    1: q1
  q0:
    0: q1
    1: q0
`
      expect(() => parser.parseDFA(duplicateStateKeys))
        .toThrow(/Map keys must be unique/)
    })

    test('throws on duplicate transition keys within state', () => {
      const duplicateTransitionKeys = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q1]
delta:
  q0:
    0: q0
    1: q1
    0: q1
  q1:
    0: q0
    1: q1
`
      expect(() => parser.parseDFA(duplicateTransitionKeys))
        .toThrow(/Map keys must be unique/)
    })
  })

  describe('Edge cases', () => {
    test('handles single state DFA', () => {
      const singleStateDFA = `
states: [q0]
input_alphabet: [0]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: q0
`
      const dfa = parser.parseDFA(singleStateDFA)
      expect(dfa.accepts('0')).toBe(true)
      expect(dfa.accepts('00')).toBe(true)
      expect(dfa.accepts('')).toBe(true)
    })

    test('handles DFA with no accept states', () => {
      const noAcceptStates = `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: []
delta:
  q0:
    0: q1
    1: q0
  q1:
    0: q0
    1: q1
`
      const dfa = parser.parseDFA(noAcceptStates)
      expect(dfa.accepts('')).toBe(false)
      expect(dfa.accepts('0')).toBe(false)
      expect(dfa.accepts('1')).toBe(false)
    })

    test('handles valid identifier state names with underscores', () => {
      const validIdentifierNames = `
states: [start_state, end_state, middle_state]
input_alphabet: [a, b]
start_state: start_state
accept_states: [end_state]
delta:
  start_state:
    a: middle_state
    b: start_state
  middle_state:
    a: end_state
    b: start_state  
  end_state:
    a: end_state
    b: end_state
`
      const dfa = parser.parseDFA(validIdentifierNames)
      expect(dfa.accepts('aa')).toBe(true)
      expect(dfa.accepts('aba')).toBe(false)
    })
  })
})