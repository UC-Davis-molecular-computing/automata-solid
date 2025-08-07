import { describe, test, expect } from 'vitest'
import { TM, TMConfiguration, ConfigDiff } from './TM'
import { TMParser } from '../parsers/TMParser'
import { deltaKey } from './Utils'

describe('TM', () => {

  // Simple 2-tape TM that doubles the input (from Dart tests)
  const doubleTM = new TM(
    ['q0', 'q1', 'q2', 'qD', 'qA', 'qR'],
    ['0'],
    ['0', '_', '$'],
    'q0',
    'qA',
    'qR',
    {
      'q0': { '0_': ['q1', '0$', 'SR'] },
      'q1': { '0_': ['q2', '00', 'SR'], '__': ['qD', '__', 'SL'] },
      'q2': { '0_': ['q1', '00', 'RR'] },
      'qD': { '_0': ['qD', '_0', 'SL'], '_$': ['qA', '_$', 'SR'] }
    }
  )

  describe('Constructor validation', () => {
    test('throws on empty state set', () => {
      expect(() => new TM(
        [],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        {}
      )).toThrow(/states cannot be empty/)
    })

    test('throws on empty input alphabet', () => {
      expect(() => new TM(
        ['q'],
        [],
        ['_'],
        'q',
        'qA',
        'qR',
        {}
      )).toThrow(/input_alphabet cannot be empty/)
    })

    test('throws on empty tape alphabet', () => {
      expect(() => new TM(
        ['q'],
        ['a'],
        [],
        'q',
        'qA',
        'qR',
        {}
      )).toThrow(/tape_alphabet cannot be empty/)
    })

    test('throws on multi-character input symbol', () => {
      expect(() => new TM(
        ['q'],
        ['ab'],
        ['ab', '_'],
        'q',
        'qA',
        'qR',
        {}
      )).toThrow(/alphabet symbols must be length 1/)
    })

    test('throws on multi-character tape symbol', () => {
      expect(() => new TM(
        ['q'],
        ['a'],
        ['a', 'bb', '_'],
        'q',
        'qA',
        'qR',
        {}
      )).toThrow(/alphabet symbols must be length 1/)
    })

    test('throws when tape alphabet does not contain blank', () => {
      expect(() => new TM(
        ['q'],
        ['a'],
        ['a', 'b'],
        'q',
        'qA',
        'qR',
        {}
      )).toThrow(/tape_alphabet must contain blank symbol/)
    })

    test('throws when input alphabet contains blank', () => {
      expect(() => new TM(
        ['q'],
        ['a', '_'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        {}
      )).toThrow(/input_alphabet cannot contain blank symbol/)
    })

    test('throws when input alphabet not subset of tape alphabet', () => {
      expect(() => new TM(
        ['q'],
        ['c'],
        ['a', 'b', '_'],
        'q',
        'qA',
        'qR',
        {}
      )).toThrow(/input_alphabet must be subset of tape_alphabet/)
    })

    test('throws on start state not in states', () => {
      expect(() => new TM(
        ['q'],
        ['a'],
        ['a', '_'],
        'missing',
        'qA',
        'qR',
        {}
      )).toThrow(/start_state "missing" not in state list/)
    })

    test('throws on accept state not in states', () => {
      expect(() => new TM(
        ['q', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'missing',
        'qR',
        {}
      )).toThrow(/accept_state "missing" not in state list/)
    })

    test('throws on reject state not in states', () => {
      expect(() => new TM(
        ['q'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'missing',
        {}
      )).toThrow(/reject_state "missing" not in state list/)
    })

    test('throws on transition from accept state', () => {
      expect(() => new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'qA': { 'a': ['q', 'a', 'R'] } }
      )).toThrow(/cannot define transition on accept state/)
    })

    test('throws on transition from reject state', () => {
      expect(() => new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'qR': { 'a': ['q', 'a', 'R'] } }
      )).toThrow(/cannot define transition on reject state/)
    })

    test('throws on inconsistent number of tapes', () => {
      expect(() => new TM(
        ['q1', 'q2', 'qA', 'qR'],
        ['0'],
        ['0', '_'],
        'q1',
        'qA',
        'qR',
        {
          'q1': { '0_': ['q2', '0_', 'SR'] },
          'q2': { '0': ['qA', '0', 'R'] } // Wrong number of symbols
        }
      )).toThrow(/all transitions must use same number of symbols/)
    })

    test('throws on invalid symbol in transition input', () => {
      expect(() => new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'x': ['qA', 'a', 'R'] } }
      )).toThrow(/symbol "x" not in tape alphabet/)
    })

    test('throws on invalid symbol in transition output', () => {
      expect(() => new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'a': ['qA', 'x', 'R'] } }
      )).toThrow(/output symbol x not in tape alphabet/)
    })

    test('throws on invalid move direction', () => {
      expect(() => new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'a': ['qA', 'a', 'X'] } }
      )).toThrow(/invalid move direction "X"/)
    })
  })

  describe('Basic functionality', () => {
    test('isHalting works correctly', () => {
      expect(doubleTM.isHalting('qA')).toBe(true)
      expect(doubleTM.isHalting('qR')).toBe(true)
      expect(doubleTM.isHalting('q0')).toBe(false)
      expect(doubleTM.isHalting('q1')).toBe(false)
    })

    test('initialConfig creates correct initial configuration', () => {
      const config = doubleTM.initialConfig('00')
      expect(config.state).toBe('q0')
      expect(config.headsPos).toEqual([0, 0])
      expect(config.tapes).toEqual([
        ['0', '0', '_'],
        ['_']
      ])
    })

    test('accepts empty string (should reject)', () => {
      expect(doubleTM.accepts('')).toBe(false)
    })

    test('accepts single 0', () => {
      expect(doubleTM.accepts('0')).toBe(true)
    })

    test('accepts double 0', () => {
      expect(doubleTM.accepts('00')).toBe(true)
    })

    test('run produces correct output for single 0', () => {
      const result = doubleTM.run('0')
      expect(result).toBe('00') // Should double the input
    })

    test('run produces correct output for double 0', () => {
      const result = doubleTM.run('00')
      expect(result).toBe('0000') // Should double the input
    })
  })

  describe('TMConfiguration', () => {
    test('copy creates independent copy', () => {
      const config1 = doubleTM.initialConfig('0')
      const config2 = config1.copy()

      config2.state = 'different'
      config2.headsPos[0] = 999
      config2.tapes[0][0] = 'X'

      expect(config1.state).toBe('q0')
      expect(config1.headsPos[0]).toBe(0)
      expect(config1.tapes[0][0]).toBe('0')
    })

    test('currentScannedSymbols works correctly', () => {
      const config = doubleTM.initialConfig('0')
      expect(config.currentScannedSymbols()).toBe('0_')
    })

    test('isHalting works correctly', () => {
      const config1 = new TMConfiguration(doubleTM, 'q0', [0, 0], [['0', '_'], ['_']])
      const config2 = new TMConfiguration(doubleTM, 'qA', [0, 0], [['0', '_'], ['_']])
      const config3 = new TMConfiguration(doubleTM, 'qR', [0, 0], [['0', '_'], ['_']])

      expect(config1.isHalting()).toBe(false)
      expect(config2.isHalting()).toBe(true)
      expect(config3.isHalting()).toBe(true)
    })

    test('outputString works correctly', () => {
      // Output tape is the last tape (tape 1 in 2-tape TM)
      const config = new TMConfiguration(doubleTM, 'qA', [0, 0], [
        ['0', '_'],
        ['0', '0', '_'] // Output: "00"
      ])
      expect(config.outputString()).toBe('00')
    })

    test('outputString handles empty output', () => {
      const config = new TMConfiguration(doubleTM, 'qA', [0, 0], [
        ['0', '_'],
        ['_'] // Empty output
      ])
      expect(config.outputString()).toBe('')
    })

    test('nextConfig throws on halting configuration', () => {
      const config = new TMConfiguration(doubleTM, 'qA', [0, 0], [['0', '_'], ['_']])
      expect(() => config.nextConfig()).toThrow(/no next configuration/)
    })

    test('goToNextConfig transitions correctly', () => {
      const config = doubleTM.initialConfig('0')
      expect(config.state).toBe('q0')
      expect(config.currentScannedSymbols()).toBe('0_')

      // Debug: check if transition exists
      const key = deltaKey(config.state, config.currentScannedSymbols())
      const action = doubleTM.delta[key]
      expect(action).toBeDefined() // Should find the q0,0_ transition
      expect(action).toEqual(['q1', '0$', 'SR'])

      config.goToNextConfig()
      expect(config.state).toBe('q1')
      expect(config.currentScannedSymbols()).toBe('0_') // After SR move: head0 stays, head1 moves right
      expect(config.headsPos).toEqual([0, 1]) // Stay, Right

      // Check that the symbols were written correctly
      expect(config.tapes[0][0]).toBe('0') // First tape position 0 should have 0
      expect(config.tapes[1][0]).toBe('$') // Second tape position 0 should have $
    })

    test('goToNextConfig handles rejection', () => {
      // Create config with no valid transition
      const config = new TMConfiguration(doubleTM, 'q0', [0, 0], [
        ['1', '_'], // Invalid input symbol '1' for this TM
        ['_']
      ])

      config.goToNextConfig()
      expect(config.state).toBe('qR') // Should reject
    })
  })

  describe('State transitions and execution', () => {
    test('statesVisited tracks execution correctly', () => {
      const states = doubleTM.statesVisited('0')
      expect(states).toEqual(['q0', 'q1', 'q2', 'q1', 'qD', 'qD', 'qD', 'qA'])
    })

    test('configsVisited produces correct sequence', () => {
      const configs = doubleTM.configsVisited('0')

      expect(configs.length).toBe(8)
      expect(configs[0].state).toBe('q0')
      expect(configs[1].state).toBe('q1')
      expect(configs[2].state).toBe('q2')
      expect(configs[3].state).toBe('q1')
      expect(configs[4].state).toBe('qD')
      expect(configs[5].state).toBe('qD')
      expect(configs[6].state).toBe('qD')
      expect(configs[7].state).toBe('qA')

      // Check final configuration has correct output
      expect(configs[7].outputString()).toBe('00')
    })

    test('execution stops at MAX_STEPS to prevent infinite loops', () => {
      // Create a TM that could loop infinitely
      const loopTM = new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        {
          'q': { 'a_': ['q', 'a_', 'RR'] } // Always move right, never halt
        }
      )

      const configs = loopTM.configsVisited('a')
      expect(configs.length).toBeLessThanOrEqual(TM.MAX_STEPS + 1) // +1 for initial config
    })
  })

  describe('String representation and utility methods', () => {
    test('toString produces readable output', () => {
      const str = doubleTM.toString()
      expect(str).toContain('states:')
      expect(str).toContain('input_alphabet:')
      expect(str).toContain('tape_alphabet:')
      expect(str).toContain('start_state:')
      expect(str).toContain('accept_state:')
      expect(str).toContain('reject_state:')
      expect(str).toContain('delta:')
    })

    test('transitionStr works correctly', () => {
      const transStr = doubleTM.transitionStr('q0', '0_')
      expect(transStr).toBe('0_ → q1 , 0$ , SR')
    })

    test('transitionStr returns null for undefined transition', () => {
      const transStr = doubleTM.transitionStr('q0', '1_')
      expect(transStr).toBe(null)
    })
  })

  describe('Equality and comparison', () => {
    test('equals returns true for identical TMs', () => {
      const tm1 = new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'a_': ['qA', 'a_', 'SR'] } }
      )

      const tm2 = new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'a_': ['qA', 'a_', 'SR'] } }
      )

      expect(tm1.equals(tm2)).toBe(true)
    })

    test('equals returns false for different number of tapes', () => {
      const tm1 = new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'a_': ['qA', 'a_', 'SR'] } } // 2 tapes
      )

      const tm2 = new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'a': ['qA', 'a', 'R'] } } // 1 tape
      )

      expect(tm1.equals(tm2)).toBe(false)
    })

    test('equals returns false for different delta functions', () => {
      const tm1 = new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'a_': ['qA', 'a_', 'SR'] } }
      )

      const tm2 = new TM(
        ['q', 'qA', 'qR'],
        ['a'],
        ['a', '_'],
        'q',
        'qA',
        'qR',
        { 'q': { 'a_': ['qR', 'a_', 'SR'] } } // Different next state
      )

      expect(tm1.equals(tm2)).toBe(false)
    })
  })

  // TM deciding { w in {0,1}* | w = w^R } - palindromes over {0,1}
  const palindromeTM = new TM(
    ['s', 'r00', 'r11', 'r01', 'r10', 'l', 'lx', 'qA', 'qR'],
    ['0', '1'],
    ['0', '1', 'x', '_'],
    's',
    'qA',
    'qR',
    {
      's': {
        '0': ['r00', 'x', 'R'],
        '1': ['r11', 'x', 'R'],
        'x': ['qA', 'x', 'S'],
        '_': ['qA', '_', 'S']  // Empty string is a palindrome
      },
      'r00': {
        '0': ['r00', '0', 'R'],
        '1': ['r01', '1', 'R'],
        '_': ['lx', '_', 'L'],
        'x': ['lx', 'x', 'L']
      },
      'r11': {
        '0': ['r10', '0', 'R'],
        '1': ['r11', '1', 'R'],
        '_': ['lx', '_', 'L'],
        'x': ['lx', 'x', 'L']
      },
      'r01': {
        '0': ['r00', '0', 'R'],
        '1': ['r01', '1', 'R'],
        '_': ['qR', '_', 'S'],  // Reject if we reach end in mismatch state
        'x': ['qR', 'x', 'S']   // Reject if we reach marker in mismatch state
      },
      'r10': {
        '0': ['r10', '0', 'R'],
        '1': ['r11', '1', 'R'],
        '_': ['qR', '_', 'S'],  // Reject if we reach end in mismatch state
        'x': ['qR', 'x', 'S']   // Reject if we reach marker in mismatch state
      },
      'lx': {
        'x': ['qA', 'x', 'S'],
        '0': ['l', 'x', 'L'],
        '1': ['l', 'x', 'L']
      },
      'l': {
        '0': ['l', '0', 'L'],
        '1': ['l', '1', 'L'],
        'x': ['s', 'x', 'R']
      }
    }
  )

  describe('Palindrome recognition functionality', () => {
    test('accepts empty string', () => {
      expect(palindromeTM.accepts('')).toBe(true)
    })

    test('accepts single character palindromes', () => {
      expect(palindromeTM.accepts('0')).toBe(true)
      expect(palindromeTM.accepts('1')).toBe(true)
    })

    test('accepts even-length palindromes', () => {
      expect(palindromeTM.accepts('00')).toBe(true)
      expect(palindromeTM.accepts('11')).toBe(true)
      expect(palindromeTM.accepts('0110')).toBe(true)
      expect(palindromeTM.accepts('1001')).toBe(true)
      expect(palindromeTM.accepts('010010')).toBe(true)
      expect(palindromeTM.accepts('101101')).toBe(true)
    })

    test('accepts odd-length palindromes', () => {
      expect(palindromeTM.accepts('010')).toBe(true)
      expect(palindromeTM.accepts('101')).toBe(true)
      expect(palindromeTM.accepts('00100')).toBe(true)
      expect(palindromeTM.accepts('11011')).toBe(true)
      expect(palindromeTM.accepts('0010100')).toBe(true)
      expect(palindromeTM.accepts('1101011')).toBe(true)
    })

    test('rejects simple non-palindromes', () => {
      expect(palindromeTM.accepts('01')).toBe(false)
      expect(palindromeTM.accepts('10')).toBe(false)
    })

    test('rejects complex non-palindromes', () => {
      expect(palindromeTM.accepts('001')).toBe(false)
      expect(palindromeTM.accepts('110')).toBe(false)
      expect(palindromeTM.accepts('0011')).toBe(false)
      expect(palindromeTM.accepts('1100')).toBe(false)
      expect(palindromeTM.accepts('01001')).toBe(false)
      expect(palindromeTM.accepts('10110')).toBe(false)
      expect(palindromeTM.accepts('001101')).toBe(false)  // Not a palindrome
      expect(palindromeTM.accepts('110010')).toBe(false) // Not a palindrome
    })

    test('rejects strings that are almost palindromes', () => {
      expect(palindromeTM.accepts('0111')).toBe(false)  // One off from 0110
      expect(palindromeTM.accepts('1000')).toBe(false)  // One off from 1001
      expect(palindromeTM.accepts('01011')).toBe(false) // One off from 01010 (which isn't palindrome anyway)
      expect(palindromeTM.accepts('10100')).toBe(false) // One off from 10101 (which isn't palindrome anyway)
    })
  })

  describe('Palindrome algorithm correctness', () => {
    test('correctly processes palindromes by marking and checking', () => {
      // Test the algorithm's state transitions for a simple case
      const states = palindromeTM.statesVisited('0110')

      // Should start at s, mark first 0 with x, go right to find matching 0 at end
      expect(states[0]).toBe('s')
      expect(states[states.length - 1]).toBe('qA')
    })

    test('shows expected rejection path for non-palindromes', () => {
      const states = palindromeTM.statesVisited('01')

      // Should start at s, mark first 0 with x, go right but find 1 at end (mismatch)
      expect(states[0]).toBe('s')
      expect(states[states.length - 1]).toBe('qR')
    })

    test('handles long palindromes correctly', () => {
      const longPalindrome = '001111100'
      expect(longPalindrome).toBe(longPalindrome.split('').reverse().join('')) // Verify it's actually a palindrome
      expect(palindromeTM.accepts(longPalindrome)).toBe(true)
    })

    test('handles long non-palindromes correctly', () => {
      const longNonPalindrome = '00111001111001' // Almost palindrome but with extra 1
      expect(longNonPalindrome).not.toBe(longNonPalindrome.split('').reverse().join('')) // Verify it's not a palindrome
      expect(palindromeTM.accepts(longNonPalindrome)).toBe(false)
    })

    test('execution terminates within reasonable steps', () => {
      // Test that algorithm doesn't run indefinitely
      const configs = palindromeTM.configsVisited('0110')
      expect(configs.length).toBeLessThan(100) // Should complete in reasonable time
      expect(configs[configs.length - 1].state).toBe('qA')
    })

    test('handles repeated patterns', () => {
      expect(palindromeTM.accepts('0000')).toBe(true)
      expect(palindromeTM.accepts('1111')).toBe(true)
      expect(palindromeTM.accepts('00110011')).toBe(false) // Not a palindrome
      expect(palindromeTM.accepts('01100110')).toBe(true)  // Is a palindrome
    })
  })

  describe('Comprehensive palindrome test suite', () => {
    // Generate systematic test cases
    const testCases = [
      // Length 0
      { input: '', expected: true },

      // Length 1
      { input: '0', expected: true },
      { input: '1', expected: true },

      // Length 2
      { input: '00', expected: true },
      { input: '01', expected: false },
      { input: '10', expected: false },
      { input: '11', expected: true },

      // Length 3
      { input: '000', expected: true },
      { input: '001', expected: false },
      { input: '010', expected: true },
      { input: '011', expected: false },
      { input: '100', expected: false },
      { input: '101', expected: true },
      { input: '110', expected: false },
      { input: '111', expected: true },

      // Length 4
      { input: '0000', expected: true },
      { input: '0110', expected: true },
      { input: '1001', expected: true },
      { input: '1111', expected: true },
      { input: '0011', expected: false },
      { input: '0101', expected: false },
      { input: '1010', expected: false },
      { input: '1100', expected: false },

      // Length 5+
      { input: '00100', expected: true },
      { input: '11011', expected: true },
      { input: '01110', expected: true },
      { input: '10001', expected: true },
      { input: '00110', expected: false },
      { input: '11001', expected: false },
      { input: '01010', expected: true },  // This IS a palindrome
      { input: '10101', expected: true }   // This IS a palindrome
    ]

    testCases.forEach(({ input, expected }) => {
      test(`palindrome "${input}" should ${expected ? 'accept' : 'reject'}`, () => {
        expect(palindromeTM.accepts(input)).toBe(expected)
      })
    })
  })

  describe('Palindrome TM structure and properties', () => {
    test('has correct basic properties', () => {
      expect(palindromeTM.states).toEqual(['s', 'r00', 'r11', 'r01', 'r10', 'l', 'lx', 'qA', 'qR'])
      expect(palindromeTM.inputAlphabet).toEqual(['0', '1'])
      expect(palindromeTM.tapeAlphabet).toEqual(['0', '1', 'x', '_'])
      expect(palindromeTM.startState).toBe('s')
      expect(palindromeTM.acceptState).toBe('qA')
      expect(palindromeTM.rejectState).toBe('qR')
      expect(palindromeTM.numTapes).toBe(1)
    })

    test('is single-tape TM', () => {
      expect(palindromeTM.numTapes).toBe(1)
    })

    test('uses marker symbol correctly', () => {
      expect(palindromeTM.tapeAlphabet).toContain('x') // Marker symbol
    })
  })

  describe('Wildcard functionality', () => {
    // Count-a TM with wildcards: counts 'a' symbols on second tape using wildcards
    const countATM = new TM(
      ['q1', 'qA', 'qR'],
      ['a', 'b', 'c', 'd', 'e', 'f'],
      ['a', 'b', 'c', 'd', 'e', 'f', '0', '_'],
      'q1',
      'qA',
      'qR',
      {
        'q1': {
          '?_': ['q1', '?_', 'RS'],  // Wildcard: copy any non-'a' symbol, stay/right
          'a_': ['q1', 'a0', 'RR'],  // Specific: for 'a', add counter on tape 2
          '__': ['qA', '__', 'SS']   // Accept when reaching end
        }
      }
    )

    // Simple wildcard TM for testing basic functionality
    const simpleWildcardTM = new TM(
      ['q0', 'q1', 'qA', 'qR'],
      ['a', 'b'],
      ['a', 'b', 'x', '_'],
      'q0',
      'qA',
      'qR',
      {
        'q0': {
          'a': ['qA', 'x', 'S'],  // Specific rule for 'a'
          '?': ['q1', '?', 'R']   // Wildcard rule for any other input
        },
        'q1': {
          '_': ['qA', '_', 'S']   // Accept at blank
        }
      }
    )

    test('count-a TM with wildcards processes input correctly', () => {
      expect(countATM.accepts('abcdef')).toBe(true)
      expect(countATM.accepts('aabbcc')).toBe(true)
      expect(countATM.accepts('')).toBe(true)
    })

    test('count-a TM wildcard vs specific transition precedence', () => {
      // Test that 'a' uses specific rule (increments counter) not wildcard rule
      const configs = countATM.configsVisited('a')
      expect(configs.length).toBeGreaterThan(1)

      // Check that 'a' was processed with counter increment
      const secondConfig = configs[1]
      expect(secondConfig.tapes[1][0]).toBe('0') // Counter should be incremented
      expect(secondConfig.tapes[0][0]).toBe('a') // Original symbol preserved
    })

    test('count-a TM wildcard copies non-a symbols', () => {
      // Test that 'b' uses wildcard rule (copies symbol, no counter)
      const configsB = countATM.configsVisited('b')
      expect(configsB.length).toBeGreaterThan(1)

      const secondConfig = configsB[1]
      expect(secondConfig.tapes[0][0]).toBe('b') // Original symbol copied via wildcard
      expect(secondConfig.tapes[1][0]).toBe('_') // No counter increment
    })

    test('simple wildcard TM exact match takes precedence', () => {
      // 'a' should use exact match (go to qA directly)
      const configsA = simpleWildcardTM.configsVisited('a')
      expect(configsA[1].state).toBe('qA')
      expect(configsA[1].tapes[0][0]).toBe('x') // Specific rule writes 'x'
    })

    test('simple wildcard TM wildcard rule for non-exact match', () => {
      // 'b' should use wildcard rule (go to q1, copy symbol)
      const configsB = simpleWildcardTM.configsVisited('b')
      expect(configsB[1].state).toBe('q1')
      expect(configsB[1].tapes[0][0]).toBe('b') // Wildcard rule copies 'b'
    })

    test('wildcard output masking works correctly', () => {
      // Create single-tape TM with wildcard output masking
      const maskingTM = new TM(
        ['q0', 'qA', 'qR'],
        ['0', '1'],
        ['0', '1', '2', '_'],
        'q0',
        'qA',
        'qR',
        {
          'q0': {
            '0': ['qA', '2', 'S'],   // Specific: 0 -> 2
            '?': ['qA', '?', 'S']    // Wildcard: input symbol copied to output
          }
        }
      )

      // Test wildcard output copying for input '1'
      const configs1 = maskingTM.configsVisited('1')
      expect(configs1[1].tapes[0][0]).toBe('1') // Input '1' copied to output

      // Test specific rule for input '0'
      const configs0 = maskingTM.configsVisited('0')
      expect(configs0[1].tapes[0][0]).toBe('2') // Specific rule: 0 -> 2
    })

    test('throws on wildcard in input alphabet', () => {
      expect(() => new TM(
        ['q0', 'qA', 'qR'],
        ['a', '?'], // Invalid: wildcard in input alphabet
        ['a', '?', '_'],
        'q0',
        'qA',
        'qR',
        { 'q0': { 'a': ['qA', 'a', 'S'] } }
      )).toThrow(/input alphabet cannot contain wildcard symbol/)
    })

    test('throws on wildcard in tape alphabet', () => {
      expect(() => new TM(
        ['q0', 'qA', 'qR'],
        ['a'],
        ['a', '?', '_'], // Invalid: wildcard in tape alphabet
        'q0',
        'qA',
        'qR',
        { 'q0': { 'a': ['qA', 'a', 'S'] } }
      )).toThrow(/tape alphabet cannot contain wildcard symbol/)
    })

    test('throws on overlapping wildcard transitions', () => {
      expect(() => new TM(
        ['q0', 'qA', 'qR'],
        ['0', '1'],
        ['0', '1', 'x', '_'],
        'q0',
        'qA',
        'qR',
        {
          'q0': {
            '0?_': ['qA', '0x_', 'SSS'], // Pattern 1: matches 00_, 01_
            '?1_': ['qA', 'x1_', 'SSS'], // Pattern 2: matches 01_, 11_ (overlaps on 01_)
            // Missing specific rule for '01_' - should cause overlap error
          }
        }
      )).toThrow(/Overlapping wildcard transitions/)
    })

    test('allows overlapping wildcards with specific override', () => {
      // Test that overlapping wildcard patterns work when specific overrides exist
      // We'll use single-tape TM for simplicity
      const tm = new TM(
        ['q0', 'qA', 'qR'],
        ['0', '1'],
        ['0', '1', 'x', 'y', '_'],
        'q0',
        'qA',
        'qR',
        {
          'q0': {
            '0': ['qA', 'x', 'S'], // Specific rule for '0'
            '1': ['qA', 'y', 'S'], // Specific rule for '1'
            '?': ['qA', '?', 'S']  // Wildcard rule (never actually used due to specific rules)
          }
        }
      )

      expect(tm.accepts('0')).toBe(true) // Uses first specific rule
      expect(tm.accepts('1')).toBe(true) // Uses second specific rule
    })

    test('throws on invalid wildcard output constraint', () => {
      expect(() => new TM(
        ['q0', 'qA', 'qR'],
        ['a'],
        ['a', 'x', '_'],
        'q0',
        'qA',
        'qR',
        {
          'q0': {
            'a': ['qA', '?', 'S'] // Invalid: output wildcard without input wildcard
          }
        }
      )).toThrow(/transitions with wildcard .* as output symbol must have it in same position/)
    })

    test('multi-tape wildcard matching works correctly', () => {
      // 3-tape TM with wildcard patterns
      const multiTapeTM = new TM(
        ['q0', 'qA', 'qR'],
        ['0', '1'],
        ['0', '1', 'x', '_'],
        'q0',
        'qA',
        'qR',
        {
          'q0': {
            '0__': ['qA', '0x_', 'SSS'], // Specific rule
            '?__': ['qA', '?x_', 'SSS']  // Wildcard rule
          }
        }
      )

      expect(multiTapeTM.accepts('0')).toBe(true) // Uses specific rule
      expect(multiTapeTM.accepts('1')).toBe(true) // Uses wildcard rule
    })

    test('complex wildcard patterns work correctly', () => {
      // Single-tape TM with simple wildcard matching
      const complexTM = new TM(
        ['q0', 'qA', 'qR'],
        ['a', 'b'],
        ['a', 'b', 'x', '_'],
        'q0',
        'qA',
        'qR',
        {
          'q0': {
            'a': ['qA', 'x', 'S'], // Specific pattern for 'a'
            '?': ['qA', '?', 'S'], // Wildcard pattern - copies input symbol
            '_': ['qA', '_', 'S']  // End condition
          }
        }
      )

      // Test specific pattern for 'a'
      const configsA = complexTM.configsVisited('a')
      expect(configsA[1].tapes[0][0]).toBe('x') // Uses specific rule: a -> x

      // Test wildcard pattern for 'b'  
      const configsB = complexTM.configsVisited('b')
      expect(configsB[1].tapes[0][0]).toBe('b') // Uses wildcard rule: ? -> ? (copies 'b')
    })
  })

  describe('ConfigDiff functionality', () => {
    // Simple single-tape TM for basic diff testing
    const simpleTM = new TM(
      ['q0', 'q1', 'qA', 'qR'],
      ['0', '1'],
      ['0', '1', 'x', '_'],
      'q0',
      'qA',
      'qR',
      {
        'q0': { '0': ['q1', 'x', 'R'] },
        'q1': { '1': ['qA', '1', 'S'], '_': ['qA', '_', 'S'] }
      }
    )

    test('ConfigDiff.diff creates correct diff between configurations', () => {
      const config1 = simpleTM.initialConfig('01')
      const config2 = config1.nextConfig()

      const diff = ConfigDiff.diff(config1, config2)

      expect(diff.oldState).toBe('q0')
      expect(diff.newState).toBe('q1')
      expect(diff.oldSymbols).toBe('0')
      expect(diff.newSymbols).toBe('x')
      expect(diff.headsPosMove[0]).toBe(1) // Head moved right
      expect(diff.tapesLenDiff[0]).toBe(0) // Tape length unchanged
    })

    test('ConfigDiff.diff handles tape length changes', () => {
      // Create a TM that will definitely force tape growth by writing at the end position
      const growTM = new TM(
        ['q0', 'q1', 'qA', 'qR'],
        ['0'],
        ['0', '_', 'X'],
        'q0',
        'qA',
        'qR',
        {
          'q0': { '0': ['q1', '0', 'R'] }, // Move to position 1 (the blank)
          'q1': { '_': ['qA', 'X', 'R'] }  // Write 'X' at blank position and move right - this forces expansion
        }
      )

      const config1 = growTM.initialConfig('0')
      config1.goToNextConfig() // Move to q1 at position 1
      const config2 = config1.nextConfig() // This should cause tape growth

      const diff = ConfigDiff.diff(config1, config2)

      expect(diff.tapesLenDiff[0]).toBe(1) // Tape grew by 1
      expect(diff.headsPosMove[0]).toBe(1) // Head moved right
    })

    test('TMConfiguration.applyDiff correctly applies diff forward', () => {
      const config1 = simpleTM.initialConfig('01')
      const config2 = config1.nextConfig()
      const diff = ConfigDiff.diff(config1, config2)

      const testConfig = config1.copy()
      testConfig.applyDiff(diff)

      expect(testConfig.state).toBe(config2.state)
      expect(testConfig.headsPos).toEqual(config2.headsPos)
      expect(testConfig.tapes).toEqual(config2.tapes)
    })

    test('TMConfiguration.applyReverseDiff correctly applies diff backward', () => {
      const config1 = simpleTM.initialConfig('01')
      const config2 = config1.nextConfig()
      const diff = ConfigDiff.diff(config1, config2)

      const testConfig = config2.copy()
      testConfig.applyReverseDiff(diff)

      expect(testConfig.state).toBe(config1.state)
      expect(testConfig.headsPos).toEqual(config1.headsPos)
      expect(testConfig.tapes).toEqual(config1.tapes)
    })

    test('applyDiff and applyReverseDiff are inverses', () => {
      const originalConfig = simpleTM.initialConfig('01')
      const nextConfig = originalConfig.nextConfig()
      const diff = ConfigDiff.diff(originalConfig, nextConfig)

      // Forward then backward should restore original
      const testConfig = originalConfig.copy()
      testConfig.applyDiff(diff)
      testConfig.applyReverseDiff(diff)

      expect(testConfig.equals(originalConfig)).toBe(true)

      // Backward then forward should restore next
      const testConfig2 = nextConfig.copy()
      testConfig2.applyReverseDiff(diff)
      testConfig2.applyDiff(diff)

      expect(testConfig2.equals(nextConfig)).toBe(true)
    })

    test('goToNextConfigWithDiff returns correct diff', () => {
      const config = simpleTM.initialConfig('01')
      const originalConfig = config.copy()

      const diff = config.goToNextConfigWithDiff()

      expect(diff.oldState).toBe('q0')
      expect(diff.newState).toBe('q1')
      expect(diff.oldSymbols).toBe('0')
      expect(diff.newSymbols).toBe('x')
      expect(diff.headsPosMove[0]).toBe(1)

      // Verify the config was actually modified
      expect(config.state).toBe('q1')
      expect(config.headsPos[0]).toBe(1)
      expect(config.tapes[0][0]).toBe('x')

      // Verify we can recreate the same result by applying diff to original
      const testConfig = originalConfig.copy()
      testConfig.applyDiff(diff)
      expect(testConfig.equals(config)).toBe(true)
    })

    test('getConfigDiffsAndFinalConfig provides memory-efficient computation', () => {
      const input = '01'
      const { diffs, finalConfig } = simpleTM.getConfigDiffsAndFinalConfig(input)

      // Should have 2 diffs for this simple computation
      expect(diffs.length).toBe(2)
      expect(finalConfig.state).toBe('qA')

      // Verify we can reconstruct the computation using diffs
      const initialConfig = simpleTM.initialConfig(input)
      let currentConfig = initialConfig.copy()

      for (const diff of diffs) {
        currentConfig.applyDiff(diff)
      }

      expect(currentConfig.equals(finalConfig)).toBe(true)
    })

    test('ConfigDiff handles rejection correctly', () => {
      const rejectTM = new TM(
        ['q0', 'qA', 'qR'],
        ['0'],
        ['0', '_'],
        'q0',
        'qA',
        'qR',
        {
          'q0': { '0': ['qA', '0', 'S'] }
          // No transition for '1' - should reject
        }
      )

      const config = rejectTM.initialConfig('1')
      const diff = config.goToNextConfigWithDiff()

      expect(diff.oldState).toBe('q0')
      expect(diff.newState).toBe('qR')
      expect(diff.oldSymbols).toBe('1')
      expect(diff.newSymbols).toBe('1') // Symbol unchanged on rejection
      expect(diff.headsPosMove[0]).toBe(0) // No movement on rejection
      expect(diff.tapesLenDiff[0]).toBe(0) // No tape length change on rejection

      expect(config.state).toBe('qR')
    })

    test('ConfigDiff works with multi-tape TMs', () => {
      const config1 = doubleTM.initialConfig('00')
      const config2 = config1.nextConfig()

      const diff = ConfigDiff.diff(config1, config2)

      expect(diff.oldState).toBe('q0')
      expect(diff.newState).toBe('q1')
      expect(diff.headsPosMove).toHaveLength(2) // Two tapes
      expect(diff.tapesLenDiff).toHaveLength(2)

      // Verify diff application works
      const testConfig = config1.copy()
      testConfig.applyDiff(diff)
      expect(testConfig.equals(config2)).toBe(true)
    })

    test('ConfigDiff handles tape expansion and contraction', () => {
      // Use doubleTM which should expand tapes
      const { diffs } = doubleTM.getConfigDiffsAndFinalConfig('0')

      // Find a diff that shows tape growth
      const growthDiff = diffs.find(diff => diff.tapesLenDiff.some(len => len > 0))
      expect(growthDiff).toBeDefined()

      if (growthDiff) {
        expect(growthDiff.tapesLenDiff[0]).toBeGreaterThanOrEqual(0)
        expect(growthDiff.tapesLenDiff[1]).toBeGreaterThanOrEqual(0)
      }
    })

    test('applyDiff throws on state mismatch', () => {
      const config1 = simpleTM.initialConfig('01')
      const config2 = config1.nextConfig()
      const diff = ConfigDiff.diff(config1, config2)

      // Try to apply diff to wrong state
      const wrongConfig = simpleTM.initialConfig('01')
      wrongConfig.state = 'q1' // Wrong state

      expect(() => wrongConfig.applyDiff(diff)).toThrow(/before states do not match/)
    })

    test('applyReverseDiff throws on state mismatch', () => {
      const config1 = simpleTM.initialConfig('01')
      const config2 = config1.nextConfig()
      const diff = ConfigDiff.diff(config1, config2)

      // Try to apply reverse diff to wrong state
      const wrongConfig = config2.copy()
      wrongConfig.state = 'q0' // Wrong state

      expect(() => wrongConfig.applyReverseDiff(diff)).toThrow(/after states do not match/)
    })

    test('ConfigDiff toString provides readable representation', () => {
      const config1 = simpleTM.initialConfig('01')
      const config2 = config1.nextConfig()
      const diff = ConfigDiff.diff(config1, config2)

      const str = diff.toString()
      expect(str).toContain('q0 → q1')
      expect(str).toContain('0 → x')
      expect(str).toContain('head moves')
      expect(str).toContain('tapes len diff')
    })
  })

  describe('TM Assembly Extra Blank Bug Investigation', () => {
    const assemblyTM = `
# TM executing simple assembly programs
# Test input: ^L00000110;Mx;L00000111;My;A;Mx;L00001001;My;A;
# Expected output: 00010110
# Alternative test: ^L00000101;Mx;My;A;Mx;My;A;Mx;My;A;Mx;My;A;

states: [write_initial_marker, read_next_instruction, load, reset_all_register_tapes, move_read_reg, move_to_x, move_to_y, add_move_to_LSB, add_carry0, add_carry1, qA, qR]
input_alphabet: [0, 1, ;, L, M, A, x, y, ^]
tape_alphabet_extra: []
start_state: write_initial_marker
accept_state: qA
reject_state: qR

delta:
  # Each register needs to start with ^_, with tape heads on first position scanning ^
  write_initial_marker:
    ^___: [read_next_instruction, ^^^^, RSSS]

  # Read next instruction
  read_next_instruction:
    L???: [load, L???, RSSR]
    M???: [move_read_reg, M???, RSSS]
    A???: [add_move_to_LSB, A???, RSSS]
    _???: [qA, _???, SSSR]  # halt

  # Execute load
  load:
    0^^?: [load, 0^^0, RSSR]
    1^^?: [load, 1^^1, RSSR]
    ;^^?: [reset_all_register_tapes, ;^^_, SLSS]
    
  # Reset register tapes back to starting ^ and go to next instruction
  reset_all_register_tapes:
    ;???: [reset_all_register_tapes, ;???, SLLL]
    ;^^^: [read_next_instruction, ;^^^, RSSS]
    
  # Figure out which register to move into
  move_read_reg:
    x^^^: [move_to_x, x^^^, RRSR]
    y^^^: [move_to_y, y^^^, RSRR]
    
  # Execute move
  move_to_x:
    ;?^0: [move_to_x, ;0^0, SRSR]
    ;?^1: [move_to_x, ;1^1, SRSR]
    ;?^_: [reset_all_register_tapes, ;_^_, SLSL]
    
  move_to_y:
    ;^?0: [move_to_y, ;^00, SSRR]
    ;^?1: [move_to_y, ;^11, SSRR]
    ;^?_: [reset_all_register_tapes, ;^__, SSLL]
    
  # Set up for add by moving to LSB
  add_move_to_LSB:
    ;???: [add_move_to_LSB, ;???, SRRR]
    ;___: [add_carry0, ;___, SLLL]

  # Add operations
  add_carry0:
    ;00?: [add_carry0, ;000, SLLL]
    ;01?: [add_carry0, ;011, SLLL]
    ;10?: [add_carry0, ;101, SLLL]
    ;11?: [add_carry1, ;110, SLLL]
    ;^^^: [read_next_instruction, ;^^^, RSSS]
    
  add_carry1:
    ;00?: [add_carry0, ;001, SLLL]
    ;01?: [add_carry1, ;010, SLLL]
    ;10?: [add_carry1, ;100, SLLL]
    ;11?: [add_carry1, ;111, SLLL]
    ;^^^: [read_next_instruction, ;^^^, RSSS]
`


    test('should track intermediate configurations during load and reset states', () => {
      const parser = new TMParser()
      const tm = parser.parseTM(assemblyTM)

      // Use the test input from the comments
      const testInput = '^L00000110;Mx;L00000111;My;A;Mx;L00001001;My;A;'

      // Get all configurations to examine intermediate steps
      const configs = tm.configsVisited(testInput)

      // Basic sanity check - make sure we don't throw an error
      expect(configs.length).toBeGreaterThan(0)
    })

    test('should identify the exact step where extra blanks appear', () => {
      const parser = new TMParser()
      const tm = parser.parseTM(assemblyTM)

      const testInput = '^L00000110;Mx;'
      const configs = tm.configsVisited(testInput)

      // Track tape lengths throughout execution
      const tapeLengths: number[][] = []

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i]
        const lengths = config.tapes.map((tape) => tape.length)
        tapeLengths.push(lengths)

        // Check if tapes 2 and 3 have different lengths
        if (lengths[2] !== lengths[3]) {
          // We found the first mismatch, this is enough for the test
          break
        }
      }
    })
  })

  describe('TM Tape Length Bug', () => {
    test('should not alternate tape lengths when heads are stationary', () => {
      // Minimal TM that reproduces the alternating blank bug
      const tmYaml = `
states: [write_initial_marker, read_next_instruction, load, reset_all_register_tapes, qA, qR]
input_alphabet: [0, 1, ;, L, M, A, x, y, ^]
tape_alphabet_extra: []
start_state: write_initial_marker
accept_state: qA
reject_state: qR

delta:
  write_initial_marker:
    ^___: [read_next_instruction, ^^^^, RSSS]
    
  read_next_instruction:
    L???: [load, L???, RSSR]
    M???: [load, M???, RSSS]
    A???: [load, A???, RSSS]
    _???: [qA, _???, SSSR]
    
  load:
    0^^?: [load, 0^^0, RSSR]
    1^^?: [load, 1^^1, RSSR]
    ;^^?: [reset_all_register_tapes, ;^^_, SLSS]
    
  reset_all_register_tapes:
    ;???: [reset_all_register_tapes, ;???, SLLL]
    ;^^^: [read_next_instruction, ;^^^, RSSS]
`
      const parser = new TMParser()
      const tm = parser.parseTM(tmYaml)

      // Input: ^L00000101;Mx;
      const input = '^L00000101;Mx;'
      const config = tm.initialConfig(input)

      // Run until we reach reset_all_register_tapes state
      while (config.state !== 'reset_all_register_tapes' && !config.isHalting()) {
        config.goToNextConfig()
      }

      // Track tape lengths during reset_all_register_tapes
      const tape1Lengths: number[] = []
      const tape2Lengths: number[] = []
      const tape3Lengths: number[] = []

      // Record lengths while in reset_all_register_tapes state
      let stepCount = 0
      while (config.state === 'reset_all_register_tapes' && !config.isHalting() && stepCount < 20) {
        tape1Lengths.push(config.tapes[1].length)
        tape2Lengths.push(config.tapes[2].length)
        tape3Lengths.push(config.tapes[3].length)

        // Also verify heads on tapes 1 and 2 stay at position 0
        expect(config.headsPos[1]).toBe(0)
        expect(config.headsPos[2]).toBe(0)

        config.goToNextConfig()
        stepCount++
      }

      // Verify we collected some data
      expect(tape1Lengths.length).toBeGreaterThan(5)

      // BUG: Currently, tapes 1 and 2 alternate between lengths 2 and 3
      // This test currently FAILS, demonstrating the bug

      // Tapes 1 and 2 should maintain constant length since their heads don't move
      const tape1AllSame = tape1Lengths.every(len => len === tape1Lengths[0])
      const tape2AllSame = tape2Lengths.every(len => len === tape2Lengths[0])


      // These assertions verify the fix works correctly
      expect(tape1AllSame).toBe(true)
      expect(tape2AllSame).toBe(true)

      // Tape 3's length should remain constant (it already has all the data)
      const tape3AllSame = tape3Lengths.every(len => len === tape3Lengths[0])
      expect(tape3AllSame).toBe(true)
    })
  })
})