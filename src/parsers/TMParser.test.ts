import { describe, test, expect } from 'vitest'
import { TMParser } from './TMParser'

describe('TMParser', () => {
  const parser = new TMParser()

  // Double TM from Dart tests (2-tape TM that doubles input)
  const doubleTMYaml = `
states: [q0, q1, q2, qD, qA, qR]
input_alphabet: ['0']
tape_alphabet_extra: [$, _]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0_: [q1, '0$', SR]
  q1:
    0_: [q2, '00', SR]
    __: [qD, __, SL]
  q2:
    0_: [q1, '00', RR]
  qD:
    _0: [qD, _0, SL]
    _$: [qA, _$, SR]
`

  // Simple 1-tape TM
  const simpleTMYaml = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: [_]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, a, R]
    _: [qR, _, S]
`

  // Palindrome TM in YAML format - decides { w in {0,1}* | w = w^R }
  const palindromeTMYaml = `
states: [s, r00, r11, r01, r10, l, lx, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: [x]
start_state: s
accept_state: qA
reject_state: qR
delta:
  s:
    0: [r00, x, R]
    1: [r11, x, R]
    x: [qA, x, S]
    _: [qA, _, S]
  r00:
    0: [r00, 0, R]
    1: [r01, 1, R]
    _: [lx, _, L]
    x: [lx, x, L]
  r11:
    0: [r10, 0, R]
    1: [r11, 1, R]
    _: [lx, _, L]
    x: [lx, x, L]
  r01:
    0: [r00, 0, R]
    1: [r01, 1, R]
    _: [qR, _, S]
    x: [qR, x, S]
  r10:
    0: [r10, 0, R]
    1: [r11, 1, R]
    _: [qR, _, S]
    x: [qR, x, S]
  lx:
    x: [qA, x, S]
    0: [l, x, L]
    1: [l, x, L]
  l:
    0: [l, 0, L]
    1: [l, 1, L]
    x: [s, x, R]
`

  describe('Valid YAML parsing', () => {
    test('parses 2-tape double TM', () => {
      const tm = parser.parseTM(doubleTMYaml)
      expect(tm).toBeDefined()
      expect(tm.numTapes).toBe(2)
      expect(tm.accepts('0')).toBe(true)
      expect(tm.run('0')).toBe('00')
    })

    test('parses simple 1-tape TM', () => {
      const tm = parser.parseTM(simpleTMYaml)
      expect(tm).toBeDefined()
      expect(tm.numTapes).toBe(1)
      expect(tm.accepts('a')).toBe(true)
      expect(tm.accepts('')).toBe(false)
    })

    test('creates TM with correct properties', () => {
      const tm = parser.parseTM(doubleTMYaml)
      
      expect(tm.states).toEqual(['q0', 'q1', 'q2', 'qD', 'qA', 'qR'])
      expect(tm.inputAlphabet).toEqual(['0'])
      expect(tm.tapeAlphabet).toEqual(['0', '$', '_'])
      expect(tm.startState).toBe('q0')
      expect(tm.acceptState).toBe('qA')
      expect(tm.rejectState).toBe('qR')
    })

    test('parses palindrome TM correctly', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      expect(tm).toBeDefined()
      expect(tm.numTapes).toBe(1)
      expect(tm.states).toEqual(['s', 'r00', 'r11', 'r01', 'r10', 'l', 'lx', 'qA', 'qR'])
      expect(tm.inputAlphabet).toEqual(['0', '1'])
      expect(tm.tapeAlphabet).toEqual(['0', '1', 'x', '_'])
      expect(tm.startState).toBe('s')
      expect(tm.acceptState).toBe('qA')
      expect(tm.rejectState).toBe('qR')
    })

    test('palindrome TM has correct number of transitions', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      // Count transitions in flattened delta
      const totalTransitions = Object.keys(tm.delta).length
      
      expect(totalTransitions).toBe(26) // Total transitions in the TM
    })
  })

  describe('YAML syntax errors', () => {
    test('throws on invalid YAML syntax', () => {
      const invalidYaml = `
states: [q0, q1
input_alphabet: [0]
`
      expect(() => parser.parseTM(invalidYaml))
        .toThrow(/YAML syntax error/)
    })

    test('throws on malformed YAML', () => {
      const malformedYaml = `
states: [q0, q1]
input_alphabet: [0
tape_alphabet_extra: []
`
      expect(() => parser.parseTM(malformedYaml))
        .toThrow(/YAML syntax error/)
    })
  })

  describe('Schema validation errors', () => {
    test('throws on missing required fields', () => {
      const missingStates = `
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
      expect(() => parser.parseTM(missingStates))
        .toThrow(/Missing required field/)
    })

    test('throws on empty states array', () => {
      const emptyStates = `
states: []
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
      expect(() => parser.parseTM(emptyStates))
        .toThrow(/at least one state/)
    })

    test('throws on empty input alphabet', () => {
      const emptyInputAlphabet = `
states: [q0, qA, qR]
input_alphabet: []
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
      expect(() => parser.parseTM(emptyInputAlphabet))
        .toThrow(/at least one symbol/)
    })

    test('automatically includes blank symbol when not specified', () => {
      const noBlankSpecified = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: [b, c]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, b, R]
`
      const tm = parser.parseTM(noBlankSpecified)
      expect(tm.tapeAlphabet).toContain('_')
      expect(tm.tapeAlphabet).toEqual(['a', 'b', 'c', '_'])
    })

    test('throws on multi-character input symbol', () => {
      const multiCharInput = `
states: [q0, qA, qR]
input_alphabet: [ab]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
      expect(() => parser.parseTM(multiCharInput))
        .toThrow(/symbols must be exactly 1 character/)
    })

    test('throws on blank symbol in input alphabet', () => {
      const blankInInput = `
states: [q0, qA, qR]
input_alphabet: [a, _]
tape_alphabet_extra: [b]
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
      expect(() => parser.parseTM(blankInInput))
        .toThrow(/cannot be.*blank symbol/)
    })

    test('allows numeric state names', () => {
      const numericStateName = `
states: [q0, '123', qA, qR]
input_alphabet: [a]
tape_alphabet_extra: [x]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: ['123', x, L]
  '123':
    x: [qA, x, S]
`
      const tm = parser.parseTM(numericStateName)
      expect(tm.states).toContain('123')
      expect(tm.accepts('a')).toBe(true) // q0 -> 123 -> qA
    })

  })

  describe('Semantic validation errors', () => {
    test('throws on start_state not in states', () => {
      const invalidStartState = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q99
accept_state: qA
reject_state: qR
delta: {}
`
      expect(() => parser.parseTM(invalidStartState))
        .toThrow(/Invalid value.*must be one of/)
    })

    test('throws on accept_state not in states', () => {
      const invalidAcceptState = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: q99
reject_state: qR
delta: {}
`
      expect(() => parser.parseTM(invalidAcceptState))
        .toThrow(/Invalid value.*must be one of/)
    })

    test('throws on reject_state not in states', () => {
      const invalidRejectState = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: q99
delta: {}
`
      expect(() => parser.parseTM(invalidRejectState))
        .toThrow(/Invalid value.*must be one of/)
    })

    test('throws on overlap between input_alphabet and tape_alphabet_extra', () => {
      const overlappingAlphabets = `
states: [q0, qA, qR]
input_alphabet: [a, b]
tape_alphabet_extra: [b]
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
      expect(() => parser.parseTM(overlappingAlphabets))
        .toThrow(/cannot overlap.*Found overlapping symbols: \{b\}/)
    })
  })

  describe('Delta validation errors', () => {
    test('throws on invalid transition format', () => {
      const invalidTransition = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, a]  # Missing move direction
`
      expect(() => parser.parseTM(invalidTransition))
        .toThrow(/Transition must be an array/)
    })

    test('throws on inconsistent tape count in delta', () => {
      const inconsistentTapes = `
states: [q0, q1, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a_: [q1, a_, SR]  # 2 tapes
    a: [qA, a, R]     # 1 tape - inconsistent!
`
      expect(() => parser.parseTM(inconsistentTapes))
        .toThrow() // Should fail on schema validation or construction
    })

    test('throws on invalid symbol in transition input', () => {
      const invalidInputSymbol = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    x: [qA, a, R]  # 'x' not in tape alphabet
`
      expect(() => parser.parseTM(invalidInputSymbol))
        .toThrow() // Should fail validation
    })

    test('throws on invalid symbol in transition output', () => {
      const invalidOutputSymbol = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, x, R]  # 'x' not in tape alphabet
`
      expect(() => parser.parseTM(invalidOutputSymbol))
        .toThrow() // Should fail validation
    })

    test('throws on invalid move direction', () => {
      const invalidMove = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, a, X]  # 'X' is not a valid move direction
`
      expect(() => parser.parseTM(invalidMove))
        .toThrow() // Should fail validation
    })

    test('throws on transition from unknown state', () => {
      const unknownState = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q99:  # State not in states list
    a: [qA, a, R]
`
      expect(() => parser.parseTM(unknownState))
        .toThrow() // Should fail validation
    })
  })

  describe('TM functionality after parsing', () => {
    test('double TM works correctly on various inputs', () => {
      const tm = parser.parseTM(doubleTMYaml)
      
      expect(tm.accepts('0')).toBe(true)
      expect(tm.run('0')).toBe('00')
      
      expect(tm.accepts('00')).toBe(true)
      expect(tm.run('00')).toBe('0000')
      
      expect(tm.accepts('')).toBe(false)
    })

    test('state transitions work correctly', () => {
      const tm = parser.parseTM(doubleTMYaml)
      const states = tm.statesVisited('0')
      
      expect(states).toEqual(['q0', 'q1', 'q2', 'q1', 'qD', 'qD', 'qD', 'qA'])
    })

    test('configurations track correctly', () => {
      const tm = parser.parseTM(doubleTMYaml)
      const configs = tm.configsVisited('0')
      
      expect(configs.length).toBe(8)
      expect(configs[0].state).toBe('q0')
      expect(configs[configs.length - 1].state).toBe('qA')
      expect(configs[configs.length - 1].outputString()).toBe('00')
    })
  })

  describe('Palindrome recognition functionality', () => {
    test('accepts palindromes correctly', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      const palindromes = ['', '0', '1', '00', '11', '010', '101', '0110', '1001', 
                          '01010', '10101', '001100', '110011', '0010100', '1101011']
      
      palindromes.forEach(palindrome => {
        expect(tm.accepts(palindrome)).toBe(true)
      })
    })

    test('rejects non-palindromes correctly', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      const nonPalindromes = ['01', '10', '001', '110', '0011', '1100', 
                             '01001', '10110', '001101', '110010', '00110', '11001']
      
      nonPalindromes.forEach(nonPalindrome => {
        expect(tm.accepts(nonPalindrome)).toBe(false)
      })
    })

    test('systematic testing for short strings', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      // Test all strings up to length 4
      const testStrings = [
        // Length 0-1
        { str: '', isPalindrome: true },
        { str: '0', isPalindrome: true },
        { str: '1', isPalindrome: true },
        
        // Length 2
        { str: '00', isPalindrome: true },
        { str: '01', isPalindrome: false },
        { str: '10', isPalindrome: false },
        { str: '11', isPalindrome: true },
        
        // Length 3
        { str: '000', isPalindrome: true },
        { str: '001', isPalindrome: false },
        { str: '010', isPalindrome: true },
        { str: '011', isPalindrome: false },
        { str: '100', isPalindrome: false },
        { str: '101', isPalindrome: true },
        { str: '110', isPalindrome: false },
        { str: '111', isPalindrome: true },
        
        // Length 4
        { str: '0000', isPalindrome: true },
        { str: '0110', isPalindrome: true },
        { str: '1001', isPalindrome: true },
        { str: '1111', isPalindrome: true },
        { str: '0011', isPalindrome: false },
        { str: '0101', isPalindrome: false },
        { str: '1010', isPalindrome: false },
        { str: '1100', isPalindrome: false }
      ]
      
      testStrings.forEach(({ str, isPalindrome }) => {
        expect(tm.accepts(str)).toBe(isPalindrome)
      })
    })

    test('correctly identifies palindrome patterns', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      // Test various palindrome patterns
      expect(tm.accepts('0')).toBe(true)        // Single symbol
      expect(tm.accepts('00')).toBe(true)       // Double same
      expect(tm.accepts('010')).toBe(true)      // Odd palindrome
      expect(tm.accepts('0110')).toBe(true)     // Even palindrome
      expect(tm.accepts('01010')).toBe(true)    // Longer odd palindrome
      expect(tm.accepts('001100')).toBe(true)   // Pattern palindrome
      
      // Test non-palindromes
      expect(tm.accepts('01')).toBe(false)      // Simple mismatch
      expect(tm.accepts('001')).toBe(false)     // Unbalanced
      expect(tm.accepts('0011')).toBe(false)    // Wrong order
      expect(tm.accepts('01001')).toBe(false)   // Complex non-palindrome
    })

    test('handles edge cases properly', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      // Empty string (trivial palindrome)
      expect(tm.accepts('')).toBe(true)
      
      // Single characters (always palindromes)
      expect(tm.accepts('0')).toBe(true)
      expect(tm.accepts('1')).toBe(true)
      
      // Longest patterns we can reasonably test
      expect(tm.accepts('001111100')).toBe(true)    // Long palindrome
      expect(tm.accepts('001111101')).toBe(false)   // Long non-palindrome
    })

    test('follows expected execution path for simple cases', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      // Test empty string (should accept immediately)
      const emptyStates = tm.statesVisited('')
      expect(emptyStates[0]).toBe('s')
      expect(emptyStates[emptyStates.length - 1]).toBe('qA')
      
      // Test single character (should accept quickly)
      const singleStates = tm.statesVisited('0')
      expect(singleStates[0]).toBe('s')
      expect(singleStates[singleStates.length - 1]).toBe('qA')
      
      // Test simple non-palindrome (should reject)
      const rejectStates = tm.statesVisited('01')
      expect(rejectStates[0]).toBe('s')
      expect(rejectStates[rejectStates.length - 1]).toBe('qR')
    })

    test('execution terminates in reasonable steps', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      const testCases = ['', '0', '1', '00', '01', '010', '101', '0110', '1001', '01001']
      
      testCases.forEach(testCase => {
        const configs = tm.configsVisited(testCase)
        expect(configs.length).toBeLessThan(1000) // Should terminate quickly
      })
    })

    test('has proper single-tape structure', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      expect(tm.numTapes).toBe(1)
      expect(tm.tapeAlphabet).toContain('_')  // Has blank symbol
      expect(tm.tapeAlphabet).toContain('x')  // Has marker symbol
      expect(tm.inputAlphabet).not.toContain('_')  // Input alphabet excludes blank
      expect(tm.inputAlphabet).not.toContain('x')  // Input alphabet excludes marker
    })

    test('has all required states for algorithm', () => {
      const tm = parser.parseTM(palindromeTMYaml)
      
      const requiredStates = ['s', 'r00', 'r11', 'r01', 'r10', 'l', 'lx', 'qA', 'qR']
      requiredStates.forEach(state => {
        expect(tm.states).toContain(state)
      })
    })
  })

  describe('Wildcard functionality', () => {
    test('basic wildcard transitions work', () => {
      const wildcardTM = `
states: [q0, qA, qR]
input_alphabet: [a, b]
tape_alphabet_extra: [x]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, a, R]
    "?": [q0, x, R]
    _: [qA, _, S]
`
      const tm = parser.parseTM(wildcardTM)
      expect(tm.accepts('a')).toBe(true)   // exact match
      expect(tm.accepts('b')).toBe(true)   // wildcard match
      expect(tm.accepts('')).toBe(true)    // blank match
    })

    test('wildcard output masking works', () => {
      const wildcardOutputTM = `
states: [q0, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: [x]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, x, S]
    "?": [qA, "?", S]
    _: [qA, _, S]
`
      const tm = parser.parseTM(wildcardOutputTM)
      
      // Test that wildcard copies input symbol
      const configs1 = tm.configsVisited('1')
      expect(configs1[1].tapes[0][0]).toBe('1')  // Input '1' should be copied to output
      
      expect(tm.accepts('1')).toBe(true)
    })

    test('count-a with wildcards', () => {
      const countATM = `
states: [q1, qA, qR]
input_alphabet: [a, b, c, d, e, f]
tape_alphabet_extra: [0]
start_state: q1
accept_state: qA
reject_state: qR
delta:
  q1:
    "?_": [q1, "?_", RS]
    "a_": [q1, a0, RR]
    "__": [qA, __, SS]
`
      const tm = parser.parseTM(countATM)
      expect(tm.accepts('abcdef')).toBe(true)
      expect(tm.run('abcdef')).toBe('')  // Counter on tape 2, output is tape 2 from head position
    })

    test('throws on wildcard in input alphabet', () => {
      const invalidWildcardInput = `
states: [q0, qA, qR]
input_alphabet: [a, "?"]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, a, S]
`
      expect(() => parser.parseTM(invalidWildcardInput))
        .toThrow(/input alphabet cannot contain wildcard symbol/)
    })

    test('throws on wildcard in tape alphabet', () => {
      const invalidWildcardTape = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: ["?"]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, a, S]
`
      expect(() => parser.parseTM(invalidWildcardTape))
        .toThrow(/tape alphabet cannot contain wildcard symbol/)
    })

    test('throws on overlapping wildcard transitions', () => {
      const overlappingWildcards = `
states: [q0, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: [x]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    "0?_": [qA, 0x_, SSS]
    "?1_": [qA, x1_, SSS]
`
      expect(() => parser.parseTM(overlappingWildcards))
        .toThrow(/Overlapping wildcard transitions/)
    })

    test('wildcard overlap detection works correctly', () => {
      // Test that the TM validates wildcard overlaps correctly
      // This should succeed because we provide specific rules for all overlaps
      const validWildcards = `
states: [q0, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: [x]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    "_": [qA, _, S]     # Handle blank input
    "?": [qA, x, S]     # Wildcard for any other input
`
      const tm = parser.parseTM(validWildcards)
      expect(tm.accepts('')).toBe(true)   // Uses blank rule
      expect(tm.accepts('0')).toBe(true)  // Uses wildcard rule
      expect(tm.accepts('1')).toBe(true)  // Uses wildcard rule
    })

    test('exact matches take precedence over wildcards', () => {
      const precedenceTM = `
states: [q0, q1, qA, qR]
input_alphabet: [a, b]
tape_alphabet_extra: [x, y]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    "?": [q1, x, R]     # Wildcard rule
    "a": [qA, y, S]     # Specific rule for 'a'
`
      const tm = parser.parseTM(precedenceTM)
      
      // 'a' should use exact match, not wildcard
      const configsA = tm.configsVisited('a')
      expect(configsA[1].state).toBe('qA')
      expect(configsA[1].tapes[0][0]).toBe('y')  // Should write 'y', not 'x'
      
      // 'b' should use wildcard
      const configsB = tm.configsVisited('b')
      expect(configsB[1].state).toBe('q1')
      expect(configsB[1].tapes[0][0]).toBe('x')  // Should write 'x'
    })

    test('throws on wildcard output without matching input wildcard', () => {
      const invalidWildcardOutput = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    a: [qA, "?", S]  # Output wildcard but input is concrete
`
      expect(() => parser.parseTM(invalidWildcardOutput))
        .toThrow(/transitions with wildcard .* as output symbol must have it in same position/)
    })
  })

  describe('Edge cases', () => {
    test('handles single state TM', () => {
      const singleStateTM = `
states: [qA]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: qA
accept_state: qA
reject_state: qA
delta: {}
`
      // Should throw error because delta must contain at least one transition
      expect(() => parser.parseTM(singleStateTM))
        .toThrow(/Delta must contain at least one transition/)
    })

    test('handles TM with no transitions', () => {
      const noTransitions = `
states: [q0, qA, qR]
input_alphabet: [a]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
      // Should throw error because delta must contain at least one transition
      expect(() => parser.parseTM(noTransitions))
        .toThrow(/Delta must contain at least one transition/)
    })

    test('handles numeric state and symbol names', () => {
      const numericNames = `
states: [q0, q1, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [q1, 1, R]
    1: [qA, 0, S]
`
      const tm = parser.parseTM(numericNames)
      expect(tm.accepts('0')).toBe(false) // Goes to q1, which has no transitions
      expect(tm.accepts('1')).toBe(true)
    })
  })

  describe('Additional schema validation errors', () => {
    test('throws on multi-character tape_alphabet_extra symbol', () => {
      const multiCharTape = `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: [abc]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, abc, R]
`
      expect(() => parser.parseTM(multiCharTape))
        .toThrow(/symbols must be exactly 1 character/)
    })

    test('throws on duplicate states', () => {
      const duplicateStates = `
states: [q0, q1, q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [q1, 0, R]
`
      expect(() => parser.parseTM(duplicateStates))
        .toThrow(/unique|duplicate/)
    })

    test('throws on extra unexpected property', () => {
      const extraProperty = `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
unexpected_field: "This should not be here"
delta:
  q0:
    0: [qA, 0, R]
`
      expect(() => parser.parseTM(extraProperty))
        .toThrow(/Unexpected property/)
    })

    test('throws on delta is null', () => {
      const nullDelta = `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: null
`
      expect(() => parser.parseTM(nullDelta))
        .toThrow(/must be an object/)
    })

    test('throws on non-string transition value', () => {
      const nonStringTransition = `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: "not an array"
`
      expect(() => parser.parseTM(nonStringTransition))
        .toThrow() // Should fail schema validation
    })

    test('throws on duplicate top-level keys', () => {
      const duplicateTopLevel = `
states: [q0, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
start_state: qA
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
    1: [qR, 1, R]
`
      expect(() => parser.parseTM(duplicateTopLevel))
        .toThrow(/Map keys must be unique/)
    })

    test('throws on duplicate state keys in delta', () => {
      const duplicateStateKeys = `
states: [q0, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
    1: [qR, 1, R]
  q0:
    0: [qR, 0, L]
    1: [qA, 1, L]
`
      expect(() => parser.parseTM(duplicateStateKeys))
        .toThrow(/Map keys must be unique/)
    })

    test('throws on duplicate transition keys within state', () => {
      const duplicateTransitionKeys = `
states: [q0, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
    1: [qR, 1, R]
    0: [qR, 0, L]
`
      expect(() => parser.parseTM(duplicateTransitionKeys))
        .toThrow(/Map keys must be unique/)
    })
  })
})