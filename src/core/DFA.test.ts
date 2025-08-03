import { describe, test, expect } from 'vitest'
import { DFA } from './DFA'

describe('DFA', () => {
  // Test DFA that accepts any string with 3 zeros at the end
  const states000 = ["lambda", "0", "00", "000"]
  const inputAlphabet = ['0', '1']
  const delta000 = {
    "lambda": {'0': "0", '1': "lambda"},
    "0":      {'0': "00", '1': "lambda"},
    "00":     {'0': "000", '1': "lambda"},
    "000":    {'0': "000", '1': "lambda"}
  }
  const startState = "lambda"
  const acceptStates000 = ["000"]

  const dfa000End = new DFA(states000, inputAlphabet, startState, acceptStates000, delta000)

  // Test DFA that accepts any string with 101 as a substring
  const states101 = ["lambda", "1", "10", "101"]
  const delta101 = {
    "lambda": {'0': "lambda", '1': "1"},
    "1":      {'0': "10", '1': "lambda"},
    "10":     {'0': "lambda", '1': "101"},
    "101":    {'0': "101", '1': "101"}
  }
  const acceptStates101 = ["101"]

  const dfa101Any = new DFA(states101, inputAlphabet, startState, acceptStates101, delta101)

  describe('Constructor validation', () => {
    test('Constructor NonChar inputAlphabet', () => {
      expect(() => new DFA(["lambda"], ['ab'], "lambda", ["lambda"], {}))
        .toThrow('Input alphabet symbols must be single characters')
    })

    test('Constructor empty state set', () => {
      expect(() => new DFA([], ['a','b'], "lambda", ["lambda"], {}))
        .toThrow('State set cannot be empty')
    })

    test('Constructor empty input alphabet', () => {
      expect(() => new DFA(['ab'], [], "lambda", ["lambda"], {}))
        .toThrow('Input alphabet cannot be empty')
    })

    const stubDelta = {
      '1': {'a': '1', 'b': '1'},
      '2': {'a': '1', 'b': '1'}
    }

    test('Constructor start state not in state set', () => {
      expect(() => new DFA(['1','2'], ['a','b'], "5", ["1"], stubDelta))
        .toThrow('Start state 5 not in state set')
    })

    test('Constructor accept states not in state set', () => {
      expect(() => new DFA(['1','2'], ['a','b'], "1", ["1",'4'], stubDelta))
        .toThrow('Accept state 4 not in state set')
    })

    test('Constructor delta not total', () => {
      expect(() => new DFA(['1','2','3'], ['a','b'], "1", ["1",'3'], {
        '1': {'a':'2', 'b':'3'},
        '2': {'a':'3', 'b':'1'},
        '3': {'b':'1'}
      })).toThrow(/not total/)
    })

    test('Constructor delta maps to non-state', () => {
      expect(() => new DFA(['1','2','3'], ['a','b'], "1", ["1",'3'], {
        '1': {'a':'2', 'b':'3'},
        '2': {'a':'3', 'b':'1'},
        '3': {'a':'2', 'b':'4'}
      })).toThrow(/state 4/)
    })
  })

  describe('Input validation', () => {
    test('accepts dfa101any with invalid character throws exception', () => {
      expect(() => dfa101Any.accepts('010010a0'))
        .toThrow(/symbol.*a.*not contained/)
    })
  })

  describe('dfa000End acceptance tests', () => {
    test('dfa000End rejects empty string', () => {
      expect(dfa000End.accepts('')).toBe(false)
    })

    test('dfa000End states visited empty string', () => {
      expect(dfa000End.statesVisited('')).toEqual(["lambda"])
    })

    test('dfa000End accepts 000', () => {
      expect(dfa000End.accepts('000')).toBe(true)
    })

    test('dfa000End states visited 000', () => {
      expect(dfa000End.statesVisited('000')).toEqual(["lambda", "0", "00", "000"])
    })

    test('dfa000End accepts 0011000', () => {
      expect(dfa000End.accepts('0011000')).toBe(true)
    })

    test('dfa000End states visited 0011000', () => {
      expect(dfa000End.statesVisited('0011000')).toEqual(["lambda", "0", "00", "lambda", "lambda", "0", "00", "000"])
    })

    test('dfa000End rejects 00110001', () => {
      expect(dfa000End.accepts('00110001')).toBe(false)
    })

    test('dfa000End states visited 00110001', () => {
      expect(dfa000End.statesVisited('00110001')).toEqual(["lambda", "0", "00", "lambda", "lambda", "0", "00", "000", "lambda"])
    })
  })

  describe('dfa101Any acceptance tests', () => {
    test('dfa101Any rejects empty string', () => {
      expect(dfa101Any.accepts('')).toBe(false)
    })

    test('dfa101Any states visited empty string', () => {
      expect(dfa101Any.statesVisited('')).toEqual(["lambda"])
    })

    test('dfa101Any accepts 101', () => {
      expect(dfa101Any.accepts('101')).toBe(true)
    })

    test('dfa101Any states visited 101', () => {
      expect(dfa101Any.statesVisited('101')).toEqual(["lambda", "1", "10", "101"])
    })

    test('dfa101Any accepts 00101', () => {
      expect(dfa101Any.accepts('00101')).toBe(true)
    })

    test('dfa101Any states visited 00101', () => {
      expect(dfa101Any.statesVisited('00101')).toEqual(["lambda", "lambda", "lambda", "1", "10", "101"])
    })

    test('dfa101Any accepts 10100', () => {
      expect(dfa101Any.accepts('10100')).toBe(true)
    })

    test('dfa101Any states visited 10100', () => {
      expect(dfa101Any.statesVisited('10100')).toEqual(["lambda", "1", "10", "101", "101", "101"])
    })

    test('dfa101Any accepts 010100', () => {
      expect(dfa101Any.accepts('010100')).toBe(true)
    })

    test('dfa101Any states visited 010100', () => {
      expect(dfa101Any.statesVisited('010100')).toEqual(["lambda", "lambda", "1", "10", "101", "101", "101"])
    })

    test('dfa101Any rejects 0100100', () => {
      expect(dfa101Any.accepts('0100100')).toBe(false)
    })

    test('dfa101Any states visited 0100100', () => {
      expect(dfa101Any.statesVisited('0100100')).toEqual(["lambda", "lambda", "1", "10", "lambda", "1", "10", "lambda"])
    })
  })
})