import { describe, test, expect } from 'vitest'
import { NFA } from './NFA'

describe('NFA', () => {
  // Test NFAs based on Dart test cases

  // NFA that accepts any string with a 0 three positions from the end
  const nfa0ThreeFromEnd = new NFA(
    ['q1', 'q2', 'q3', 'q4'],
    ['0', '1'],
    'q1',
    ['q4'],
    {
      'q1': { '0': ['q1', 'q2'], '1': ['q1'] },
      'q2': { '0': ['q3'], '1': ['q3'] },
      'q3': { '0': ['q4'], '1': ['q4'] }
    }
  )

  // NFA that accepts either "010" or "101" using epsilon transitions
  const nfa010or101 = new NFA(
    ['start', 'start010', '0', '01', '010', 'start101', '1', '10', '101'],
    ['0', '1'],
    'start',
    ['010', '101'],
    {
      'start': { '': ['start010', 'start101'] },
      'start010': { '0': ['0'] },
      '0': { '1': ['01'] },
      '01': { '0': ['010'] },
      'start101': { '1': ['1'] },
      '1': { '0': ['10'] },
      '10': { '1': ['101'] }
    }
  )

  // NFA with only epsilon transitions
  const nfaEpsilonEnd = new NFA(
    ['start', 'middle', 'end'],
    ['0', '1'],
    'start',
    ['end'],
    {
      'start': { '': ['middle'] },
      'middle': { '': ['end'] }
    }
  )

  describe('Constructor validation', () => {
    test('throws on empty state set', () => {
      expect(() => new NFA([], ['a', 'b'], 'start', ['end'], {}))
        .toThrow(/states cannot be empty/)
    })

    test('throws on empty input alphabet', () => {
      expect(() => new NFA(['start'], [], 'start', ['start'], {}))
        .toThrow(/input_alphabet cannot be empty/)
    })

    test('throws on multi-character input symbol', () => {
      expect(() => new NFA(['start'], ['ab'], 'start', ['start'], {}))
        .toThrow(/exactly one character/)
    })

    test('throws on start state not in state set', () => {
      expect(() => new NFA(['q1', 'q2'], ['a'], 'q3', ['q1'], {}))
        .toThrow(/start_state "q3" not in state list/)
    })

    test('throws on accept state not in state set', () => {
      expect(() => new NFA(['q1', 'q2'], ['a'], 'q1', ['q1', 'q3'], {}))
        .toThrow(/accept_state "q3" not in state list/)
    })

    test('throws on delta source state not in state set', () => {
      expect(() => new NFA(['q1', 'q2'], ['a'], 'q1', ['q1'], {
        'q1': { 'a': ['q2'] },
        'q3': { 'a': ['q1'] }
      })).toThrow(/state "q3" not in state list/)
    })

    test('throws on delta symbol not in alphabet or epsilon', () => {
      expect(() => new NFA(['q1', 'q2'], ['a'], 'q1', ['q1'], {
        'q1': { 'b': ['q2'] }
      })).toThrow(/symbol "b" not in alphabet/)
    })

    test('throws on delta target state not in state set', () => {
      expect(() => new NFA(['q1', 'q2'], ['a'], 'q1', ['q1'], {
        'q1': { 'a': ['q3'] }
      })).toThrow(/next state "q3" not in state set/)
    })

    test('allows epsilon transitions', () => {
      expect(() => new NFA(['q1', 'q2'], ['a'], 'q1', ['q2'], {
        'q1': { '': ['q2'], 'a': ['q1'] }
      })).not.toThrow()
    })
  })

  describe('accepts method', () => {
    test('throws on input character not in alphabet', () => {
      expect(() => nfa0ThreeFromEnd.accepts('010010a0'))
        .toThrow(/not contained in alphabet/)
    })

    test('nfa0ThreeFromEnd rejects empty string', () => {
      expect(nfa0ThreeFromEnd.accepts('')).toBe(false)
    })

    test('nfa0ThreeFromEnd accepts 000', () => {
      expect(nfa0ThreeFromEnd.accepts('000')).toBe(true)
    })

    test('nfa0ThreeFromEnd accepts 0011001', () => {
      expect(nfa0ThreeFromEnd.accepts('0011001')).toBe(true)
    })

    test('nfa0ThreeFromEnd rejects 0011101', () => {
      expect(nfa0ThreeFromEnd.accepts('0011101')).toBe(false)
    })

    test('nfa010or101 rejects empty string', () => {
      expect(nfa010or101.accepts('')).toBe(false)
    })

    test('nfa010or101 rejects 000', () => {
      expect(nfa010or101.accepts('000')).toBe(false)
    })

    test('nfa010or101 rejects 0101', () => {
      expect(nfa010or101.accepts('0101')).toBe(false)
    })

    test('nfa010or101 accepts 010', () => {
      expect(nfa010or101.accepts('010')).toBe(true)
    })

    test('nfa010or101 accepts 101', () => {
      expect(nfa010or101.accepts('101')).toBe(true)
    })

    test('nfaEpsilonEnd accepts empty string', () => {
      expect(nfaEpsilonEnd.accepts('')).toBe(true)
    })

    test('nfaEpsilonEnd rejects 0', () => {
      expect(nfaEpsilonEnd.accepts('0')).toBe(false)
    })
  })

  describe('stateSetsVisited method', () => {
    test('nfaEpsilonEnd empty string', () => {
      expect(nfaEpsilonEnd.stateSetsVisited('')).toEqual([
        ['end', 'middle', 'start']
      ])
    })

    test('nfaEpsilonEnd single character', () => {
      expect(nfaEpsilonEnd.stateSetsVisited('0')).toEqual([
        ['end', 'middle', 'start'],
        []
      ])
    })

    test('nfa010or101 empty string', () => {
      expect(nfa010or101.stateSetsVisited('')).toEqual([
        ['start', 'start010', 'start101']
      ])
    })

    test('nfa010or101 single 0', () => {
      expect(nfa010or101.stateSetsVisited('0')).toEqual([
        ['start', 'start010', 'start101'],
        ['0']
      ])
    })

    test('nfa010or101 single 1', () => {
      expect(nfa010or101.stateSetsVisited('1')).toEqual([
        ['start', 'start010', 'start101'],
        ['1']
      ])
    })

    test('nfa010or101 string 010', () => {
      expect(nfa010or101.stateSetsVisited('010')).toEqual([
        ['start', 'start010', 'start101'],
        ['0'],
        ['01'],
        ['010']
      ])
    })

    test('nfa010or101 string 101', () => {
      expect(nfa010or101.stateSetsVisited('101')).toEqual([
        ['start', 'start010', 'start101'],
        ['1'],
        ['10'],
        ['101']
      ])
    })

    test('nfa010or101 string 1010', () => {
      expect(nfa010or101.stateSetsVisited('1010')).toEqual([
        ['start', 'start010', 'start101'],
        ['1'],
        ['10'],
        ['101'],
        []
      ])
    })

    test('nfa0ThreeFromEnd empty string', () => {
      expect(nfa0ThreeFromEnd.stateSetsVisited('')).toEqual([
        ['q1']
      ])
    })

    test('nfa0ThreeFromEnd single 0', () => {
      expect(nfa0ThreeFromEnd.stateSetsVisited('0')).toEqual([
        ['q1'],
        ['q1', 'q2']
      ])
    })

    test('nfa0ThreeFromEnd string 01', () => {
      expect(nfa0ThreeFromEnd.stateSetsVisited('01')).toEqual([
        ['q1'],
        ['q1', 'q2'],
        ['q1', 'q3']
      ])
    })

    test('nfa0ThreeFromEnd string 010', () => {
      expect(nfa0ThreeFromEnd.stateSetsVisited('010')).toEqual([
        ['q1'],
        ['q1', 'q2'],
        ['q1', 'q3'],
        ['q1', 'q2', 'q4']
      ])
    })

    test('nfa0ThreeFromEnd string 0101', () => {
      expect(nfa0ThreeFromEnd.stateSetsVisited('0101')).toEqual([
        ['q1'],
        ['q1', 'q2'],
        ['q1', 'q3'],
        ['q1', 'q2', 'q4'],
        ['q1', 'q3']
      ])
    })
  })

  describe('transitionStr method', () => {
    test('returns correct transition string for regular symbol', () => {
      expect(nfa0ThreeFromEnd.transitionStr('q1', '0')).toBe('0 → {q1,q2}')
      expect(nfa0ThreeFromEnd.transitionStr('q1', '1')).toBe('1 → {q1}')
    })

    test('returns correct transition string for epsilon', () => {
      expect(nfa010or101.transitionStr('start', '')).toBe('ε → {start010,start101}')
    })

    test('returns null for undefined transition', () => {
      expect(nfa0ThreeFromEnd.transitionStr('q4', '0')).toBe(null)
      expect(nfa0ThreeFromEnd.transitionStr('q4', '1')).toBe(null)
    })

    test('throws on invalid symbol', () => {
      expect(() => nfa0ThreeFromEnd.transitionStr('q1', 'a'))
        .toThrow(/not contained in input alphabet/)
    })
  })

  describe('transitionDefined method', () => {
    test('returns true for defined transitions', () => {
      expect(nfa0ThreeFromEnd.transitionDefined('q1', '0')).toBe(true)
      expect(nfa0ThreeFromEnd.transitionDefined('q1', '1')).toBe(true)
      expect(nfa010or101.transitionDefined('start', '')).toBe(true)
    })

    test('returns false for undefined transitions', () => {
      expect(nfa0ThreeFromEnd.transitionDefined('q4', '0')).toBe(false)
      expect(nfa0ThreeFromEnd.transitionDefined('q4', '1')).toBe(false)
    })

    test('returns false for empty target arrays', () => {
      const nfaEmptyTargets = new NFA(
        ['q0', 'q1'],
        ['0'],
        'q0',
        ['q1'],
        { 'q0': { '0': [] } }
      )
      expect(nfaEmptyTargets.transitionDefined('q0', '0')).toBe(false)
    })
  })

  describe('equals method', () => {
    test('returns true for identical NFAs', () => {
      const nfa1 = new NFA(['q0', 'q1'], ['a'], 'q0', ['q1'], {
        'q0': { 'a': ['q1'] },
        'q1': { 'a': ['q0'] }
      })
      const nfa2 = new NFA(['q0', 'q1'], ['a'], 'q0', ['q1'], {
        'q0': { 'a': ['q1'] },
        'q1': { 'a': ['q0'] }
      })
      expect(nfa1.equals(nfa2)).toBe(true)
    })

    test('returns false for NFAs with different states', () => {
      const nfa1 = new NFA(['q0', 'q1'], ['a'], 'q0', ['q1'], {})
      const nfa2 = new NFA(['q0', 'q2'], ['a'], 'q0', ['q2'], {})
      expect(nfa1.equals(nfa2)).toBe(false)
    })

    test('returns false for NFAs with different input alphabets', () => {
      const nfa1 = new NFA(['q0'], ['a'], 'q0', ['q0'], {})
      const nfa2 = new NFA(['q0'], ['b'], 'q0', ['q0'], {})
      expect(nfa1.equals(nfa2)).toBe(false)
    })

    test('returns false for NFAs with different start states', () => {
      const nfa1 = new NFA(['q0', 'q1'], ['a'], 'q0', ['q1'], {})
      const nfa2 = new NFA(['q0', 'q1'], ['a'], 'q1', ['q1'], {})
      expect(nfa1.equals(nfa2)).toBe(false)
    })

    test('returns false for NFAs with different accept states', () => {
      const nfa1 = new NFA(['q0', 'q1'], ['a'], 'q0', ['q0'], {})
      const nfa2 = new NFA(['q0', 'q1'], ['a'], 'q0', ['q1'], {})
      expect(nfa1.equals(nfa2)).toBe(false)
    })

    test('returns false for NFAs with different delta functions', () => {
      const nfa1 = new NFA(['q0', 'q1'], ['a'], 'q0', ['q1'], {
        'q0': { 'a': ['q1'] }
      })
      const nfa2 = new NFA(['q0', 'q1'], ['a'], 'q0', ['q1'], {
        'q0': { 'a': ['q0'] }
      })
      expect(nfa1.equals(nfa2)).toBe(false)
    })
  })

  describe('toString method', () => {
    test('produces formatted string representation', () => {
      const nfa = new NFA(['q0', 'q1'], ['a'], 'q0', ['q1'], {
        'q0': { 'a': ['q1'], '': ['q0'] },
        'q1': { 'a': ['q0'] }
      })
      const str = nfa.toString()
      
      expect(str).toContain('states:         {q0,q1}')
      expect(str).toContain('input_alphabet: {a}')
      expect(str).toContain('start_state:    q0')
      expect(str).toContain('accept_states:  {q1}')
      expect(str).toContain('delta:')
    })
  })

  describe('Edge cases', () => {
    test('handles NFA with single state', () => {
      const singleStateNFA = new NFA(['q0'], ['a'], 'q0', ['q0'], {
        'q0': { 'a': ['q0'] }
      })
      
      expect(singleStateNFA.accepts('')).toBe(true)
      expect(singleStateNFA.accepts('a')).toBe(true)
      expect(singleStateNFA.accepts('aa')).toBe(true)
    })

    test('handles NFA with no accept states', () => {
      const noAcceptNFA = new NFA(['q0', 'q1'], ['a'], 'q0', [], {
        'q0': { 'a': ['q1'] },
        'q1': { 'a': ['q0'] }
      })
      
      expect(noAcceptNFA.accepts('')).toBe(false)
      expect(noAcceptNFA.accepts('a')).toBe(false)
      expect(noAcceptNFA.accepts('aa')).toBe(false)
    })

    test('handles complex epsilon closures', () => {
      const complexEpsilonNFA = new NFA(
        ['q0', 'q1', 'q2', 'q3'],
        ['a'],
        'q0',
        ['q3'],
        {
          'q0': { '': ['q1'] },
          'q1': { '': ['q2'] },
          'q2': { 'a': ['q3'] }
        }
      )
      
      expect(complexEpsilonNFA.accepts('a')).toBe(true)
      expect(complexEpsilonNFA.accepts('')).toBe(false)
      expect(complexEpsilonNFA.accepts('aa')).toBe(false)
    })
  })
})