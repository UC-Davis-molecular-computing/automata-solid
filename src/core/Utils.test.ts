import { describe, test, expect } from 'vitest'
import { 
  setNotation, 
  checkAgainstInputAlphabet, 
  wildcardMatch, 
  wildcardMaskedOutput, 
  wildcardIntersect 
} from './Utils'

describe('Utils', () => {
  describe('setNotation', () => {
    test('formats empty string correctly', () => {
      expect(setNotation([''])).toBe("{''}")
    })

    test('formats regular strings', () => {
      expect(setNotation(['a', 'b', 'c'])).toBe('{a,b,c}')
    })
  })

  describe('checkAgainstInputAlphabet', () => {
    test('passes for valid input', () => {
      expect(() => checkAgainstInputAlphabet(['a', 'b'], 'aba')).not.toThrow()
    })

    test('throws for invalid character', () => {
      expect(() => checkAgainstInputAlphabet(['a', 'b'], 'abc'))
        .toThrow(/symbol 'c' not contained in alphabet/)
    })
  })

  describe('Wildcard utilities', () => {
    describe('wildcardMatch', () => {
      test('matches exact strings', () => {
        expect(wildcardMatch('abc', 'abc')).toBe(true)
        expect(wildcardMatch('abc', 'def')).toBe(false)
      })

      test('matches with single wildcard', () => {
        expect(wildcardMatch('abc', 'a?c')).toBe(true)
        expect(wildcardMatch('axc', 'a?c')).toBe(true)
        expect(wildcardMatch('abc', 'a?d')).toBe(false)
      })

      test('matches with multiple wildcards', () => {
        expect(wildcardMatch('abc', '???')).toBe(true)
        expect(wildcardMatch('abc', '?b?')).toBe(true)
        expect(wildcardMatch('abc', '?a?')).toBe(false)
      })

      test('rejects different lengths', () => {
        expect(wildcardMatch('abc', 'a?')).toBe(false)
        expect(wildcardMatch('ab', 'a?c')).toBe(false)
      })

      test('handles empty strings', () => {
        expect(wildcardMatch('', '')).toBe(true)
        expect(wildcardMatch('', '?')).toBe(false)
      })
    })

    describe('wildcardMaskedOutput', () => {
      test('copies wildcards from input', () => {
        expect(wildcardMaskedOutput('abc', '?b?')).toBe('abc')
        expect(wildcardMaskedOutput('xyz', '?b?')).toBe('xbz')
      })

      test('keeps concrete symbols in output', () => {
        expect(wildcardMaskedOutput('abc', 'xyz')).toBe('xyz')
        expect(wildcardMaskedOutput('000', '2?3')).toBe('203')
        expect(wildcardMaskedOutput('010', '2?3')).toBe('213')
      })

      test('handles all wildcards', () => {
        expect(wildcardMaskedOutput('abc', '???')).toBe('abc')
      })

      test('throws on length mismatch', () => {
        expect(() => wildcardMaskedOutput('ab', 'a?c'))
          .toThrow(/Input and output pattern must have same length/)
      })
    })

    describe('wildcardIntersect', () => {
      const alphabet = ['0', '1']

      test('intersects concrete strings', () => {
        expect(wildcardIntersect('000', '001', alphabet)).toEqual([])
        expect(wildcardIntersect('000', '000', alphabet)).toEqual(['000'])
      })

      test('intersects wildcard patterns', () => {
        expect(wildcardIntersect('0?0', '0?0', alphabet)).toEqual(['000', '010'])
        expect(wildcardIntersect('0?0', '0?1', alphabet)).toEqual([])
      })

      test('intersects mixed patterns', () => {
        expect(wildcardIntersect('00?', '0?0', alphabet)).toEqual(['000'])
        expect(wildcardIntersect('0??0', '0?0?', alphabet)).toEqual(['0000', '0100'])
      })

      test('intersects concrete with wildcard', () => {
        expect(wildcardIntersect('0000', '????', alphabet)).toEqual(['0000'])
      })

      test('intersects all wildcards', () => {
        const result = wildcardIntersect('???', '???', alphabet)
        expect(result).toEqual(['000', '001', '010', '011', '100', '101', '110', '111'])
      })

      test('handles empty strings', () => {
        expect(wildcardIntersect('', '', alphabet)).toEqual([''])
      })

      test('handles different lengths', () => {
        expect(wildcardIntersect('0?', '0?0', alphabet)).toEqual([])
      })
    })
  })
})