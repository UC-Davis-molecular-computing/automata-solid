import { describe, test, expect } from 'vitest'
import { Regex } from './Regex'
import { RegexParser } from '../parsers/RegexParser'

describe('Regex', () => {
  describe('Basic regex functionality', () => {
    const regex0or1 = new Regex('0|1')

    test('constructor validates illegal characters', () => {
      expect(() => new Regex('#00101|01*(01|10)+'))
        .toThrow(/illegal characters/)
    })

    test('RegexParser should handle comments in default regex format', () => {
      // This is the exact default regex content from AppStore.ts that's causing the error
      const defaultRegexWithComments = `# Matches any binary string containing the substring 010
B = (0|1)*;  # subexpression matching any binary string
B 010 B`
      
      // RegexParser should handle comment stripping and not throw an error
      const parser = new RegexParser()
      expect(() => parser.parseRegex(defaultRegexWithComments)).not.toThrow()
      
      // The resulting regex should work correctly
      const regex = parser.parseRegex(defaultRegexWithComments)
      expect(regex.accepts('010')).toBe(true)
      expect(regex.accepts('1010')).toBe(true)
      expect(regex.accepts('01010')).toBe(true)
      expect(regex.accepts('111')).toBe(false)
      expect(regex.accepts('0011001')).toBe(false)
      expect(regex.accepts('001100110')).toBe(false)
      expect(regex.accepts('00110010')).toBe(true)
    })

    test('rejects empty string', () => {
      expect(regex0or1.accepts('')).toBe(false)
    })

    test('accepts 0', () => {
      expect(regex0or1.accepts('0')).toBe(true)
    })

    test('accepts 1', () => {
      expect(regex0or1.accepts('1')).toBe(true)
    })

    test('rejects 00', () => {
      expect(regex0or1.accepts('00')).toBe(false)
    })

    test('rejects 01', () => {
      expect(regex0or1.accepts('01')).toBe(false)
    })

    test('rejects 10', () => {
      expect(regex0or1.accepts('10')).toBe(false)
    })

    test('rejects 11', () => {
      expect(regex0or1.accepts('11')).toBe(false)
    })

    test('rejects letter a', () => {
      expect(regex0or1.accepts('a')).toBe(false)
    })

    test('rejects mixed 0a', () => {
      expect(regex0or1.accepts('0a')).toBe(false)
    })
  })

  describe('Whitespace handling', () => {
    test('strips whitespace from regex', () => {
      const regexWithWhitespace = new Regex(' 0 | 1 ')
      expect(regexWithWhitespace.accepts('1')).toBe(true)
      expect(regexWithWhitespace.accepts('00')).toBe(false)
      expect(regexWithWhitespace.accepts('a')).toBe(false)
      expect(regexWithWhitespace.accepts('0a')).toBe(false)
    })

    test('strips newlines and tabs', () => {
      const regexWithNewlines = new Regex('0\n|\t1')
      expect(regexWithNewlines.accepts('0')).toBe(true)
      expect(regexWithNewlines.accepts('1')).toBe(true)
    })
  })

  describe('Complex regex patterns', () => {
    test('Kleene star', () => {
      const starRegex = new Regex('0*')
      expect(starRegex.accepts('')).toBe(true)
      expect(starRegex.accepts('0')).toBe(true)
      expect(starRegex.accepts('00')).toBe(true)
      expect(starRegex.accepts('000')).toBe(true)
      expect(starRegex.accepts('1')).toBe(false)
      expect(starRegex.accepts('01')).toBe(false)
    })

    test('Plus operator', () => {
      const plusRegex = new Regex('1+')
      expect(plusRegex.accepts('')).toBe(false)
      expect(plusRegex.accepts('1')).toBe(true)
      expect(plusRegex.accepts('11')).toBe(true)
      expect(plusRegex.accepts('111')).toBe(true)
      expect(plusRegex.accepts('0')).toBe(false)
      expect(plusRegex.accepts('10')).toBe(false)
    })

    test('Parentheses grouping', () => {
      const groupRegex = new Regex('(01)*')
      expect(groupRegex.accepts('')).toBe(true)
      expect(groupRegex.accepts('01')).toBe(true)
      expect(groupRegex.accepts('0101')).toBe(true)
      expect(groupRegex.accepts('010101')).toBe(true)
      expect(groupRegex.accepts('0')).toBe(false)
      expect(groupRegex.accepts('1')).toBe(false)
      expect(groupRegex.accepts('010')).toBe(false)
    })

    test('Complex combination', () => {
      const complexRegex = new Regex('(0|1)*00')
      expect(complexRegex.accepts('00')).toBe(true)
      expect(complexRegex.accepts('000')).toBe(true)
      expect(complexRegex.accepts('100')).toBe(true)
      expect(complexRegex.accepts('0100')).toBe(true)
      expect(complexRegex.accepts('110100')).toBe(true)
      expect(complexRegex.accepts('0')).toBe(false)
      expect(complexRegex.accepts('1')).toBe(false)
      expect(complexRegex.accepts('01')).toBe(false)
      expect(complexRegex.accepts('001')).toBe(false)
    })
  })

  describe('Dot and @ characters', () => {
    test('dot character is literal', () => {
      const dotRegex = new Regex('a.b')
      expect(dotRegex.accepts('a.b')).toBe(true)
      expect(dotRegex.accepts('axb')).toBe(false) // dot is literal, not wildcard
    })

    test('@ character is literal', () => {
      const atRegex = new Regex('user@domain')
      expect(atRegex.accepts('user@domain')).toBe(true)
      expect(atRegex.accepts('userXdomain')).toBe(false)
    })
  })

  describe('Input alphabet extraction', () => {
    test('extracts alphabet correctly', () => {
      const regex = new Regex('(a|b)*c+')
      const alphabet = regex.getInputAlphabet()
      expect(alphabet).toEqual(['a', 'b', 'c'])
    })

    test('excludes special characters from alphabet', () => {
      const regex = new Regex('0*|1+')
      const alphabet = regex.getInputAlphabet()
      expect(alphabet).toEqual(['0', '1'])
    })

    test('includes dot and @ in alphabet', () => {
      const regex = new Regex('a.@b')
      const alphabet = regex.getInputAlphabet()
      expect(alphabet).toEqual(['.', '@', 'a', 'b'])
    })
  })

  describe('Subexpressions', () => {
    test('simple variable substitution', () => {
      const regex = new Regex('A = 0|1; A*')
      expect(regex.accepts('')).toBe(true)
      expect(regex.accepts('0')).toBe(true)
      expect(regex.accepts('1')).toBe(true)
      expect(regex.accepts('01')).toBe(true)
      expect(regex.accepts('10')).toBe(true)
      expect(regex.accepts('0101')).toBe(true)
      expect(regex.accepts('a')).toBe(false)
    })

    test('multiple variable substitution', () => {
      const regex = new Regex('A = 0|1; B = A*; B 1 B') // at least one 1
      expect(regex.accepts('')).toBe(false)
      expect(regex.accepts('0')).toBe(false)
      expect(regex.accepts('1')).toBe(true)
      expect(regex.accepts('00')).toBe(false)
      expect(regex.accepts('010')).toBe(true)
      expect(regex.accepts('1001')).toBe(true)
      expect(regex.accepts('0110101')).toBe(true)
    })

    test('nested variable references', () => {
      const regex = new Regex('A = 0; B = A|1; C = B*; C')
      expect(regex.accepts('')).toBe(true)
      expect(regex.accepts('0')).toBe(true)
      expect(regex.accepts('1')).toBe(true)
      expect(regex.accepts('01')).toBe(true)
      expect(regex.accepts('10')).toBe(true)
      expect(regex.accepts('0101')).toBe(true)
    })

    test('complex alphabet example', () => {
      const regex = new Regex('Sigma = a|b|c; Sigma* abc Sigma*')
      expect(regex.accepts('abc')).toBe(true)
      expect(regex.accepts('aabcc')).toBe(true) // (a|b|c)* matches 'aa', 'abc' matches, (a|b|c)* matches 'cc'
      expect(regex.accepts('aabccc')).toBe(true)
      expect(regex.accepts('abcabc')).toBe(true) // first part matches empty, 'abc' matches, last part matches 'abc'  
      expect(regex.accepts('xabc')).toBe(false) // x not in alphabet
    })

    test('throws on invalid subexpression format', () => {
      expect(() => new Regex('A = 0|1; B = A*;'))
        .toThrow(/invalid subexpression format/i)
    })

    test('throws on missing equals sign', () => {
      expect(() => new Regex('A 0|1; A*'))
        .toThrow(/missing =/i)
    })

    test('throws on invalid variable name', () => {
      expect(() => new Regex('1A = 0|1; 1A*'))
        .toThrow(/invalid variable name/i)
    })

    test('throws on empty variable value', () => {
      expect(() => new Regex('A = ; A*'))
        .toThrow(/invalid variable value/i)
    })

    test('handles longer variable names correctly', () => {
      const regex = new Regex('DIGIT = 0|1|2|3|4|5|6|7|8|9; DIGIT+')
      expect(regex.accepts('123')).toBe(true)
      expect(regex.accepts('0')).toBe(true)
      expect(regex.accepts('')).toBe(false)
      expect(regex.accepts('a')).toBe(false)
    })

    test('prevents circular references', () => {
      expect(() => new Regex('A = B; B = A; A'))
        .toThrow(/exceeded maximum iterations/i)
    })
  })

  describe('Edge cases and error handling', () => {
    test('empty regex', () => {
      const emptyRegex = new Regex('')
      expect(emptyRegex.accepts('')).toBe(true)
      expect(emptyRegex.accepts('a')).toBe(false)
    })

    test('fromString factory method', () => {
      const regex = Regex.fromString('  0|1  ')
      expect(regex.accepts('0')).toBe(true)
      expect(regex.accepts('1')).toBe(true)
    })

    test('toString returns original string', () => {
      const originalStr = '(a|b)*c+'
      const regex = new Regex(originalStr)
      expect(regex.toString()).toBe(originalStr)
    })

    test('toString preserves original with subexpressions', () => {
      const originalStr = 'A = 0|1; A*'
      const regex = new Regex(originalStr)
      expect(regex.toString()).toBe(originalStr)
    })

    test('validates all illegal characters', () => {
      const illegalChars = ['#', '$', '%', '^', '&', '!', '?', '[', ']', '{', '}']
      
      for (const char of illegalChars) {
        expect(() => new Regex(`a${char}b`))
          .toThrow(/illegal characters/)
      }
    })

    test('allows all legal characters', () => {
      expect(() => new Regex('abcABC123.@()a*b+c|d')).not.toThrow()
    })
  })

  describe('Matching behavior', () => {
    test('matches whole string only, not substring', () => {
      const regex = new Regex('abc')
      expect(regex.accepts('abc')).toBe(true)
      expect(regex.accepts('abcdef')).toBe(false) // should not match substring
      expect(regex.accepts('xabc')).toBe(false) // should not match substring
      expect(regex.accepts('xabcy')).toBe(false) // should not match substring
    })

    test('complex pattern with anchoring', () => {
      const regex = new Regex('(0|1)*000')
      expect(regex.accepts('000')).toBe(true)
      expect(regex.accepts('1000')).toBe(true)
      expect(regex.accepts('0001000')).toBe(true) // DOES end with 000
      expect(regex.accepts('x000')).toBe(false) // contains invalid character
    })
  })

  describe('Subexpression bug test', () => {
    test('should handle subexpression with semicolons correctly', () => {
      const regexStr = `B = (0|1)*; B 010 B`
      
      // This should work - matches any binary string containing 010 as a substring
      const regex = new Regex(regexStr)
      
      expect(regex.accepts('010')).toBe(true)      // exact match
      expect(regex.accepts('1010')).toBe(true)     // 010 at end
      expect(regex.accepts('0101')).toBe(true)     // 010 at start
      expect(regex.accepts('101010')).toBe(true)   // 010 in middle
      expect(regex.accepts('0100')).toBe(true)     // 010 at start
      expect(regex.accepts('001011')).toBe(true)   // 010 in middle
      
      expect(regex.accepts('000')).toBe(false)     // no 010
      expect(regex.accepts('111')).toBe(false)     // no 010
      expect(regex.accepts('101')).toBe(false)     // no 010
      expect(regex.accepts('')).toBe(false)       // empty string
    })
  })

  describe('Variable substitution in expressions', () => {
    test('should substitute variables that appear multiple times consecutively', () => {
      const regex = new Regex('A = 0|1|2|3|4|5|6|7|8|9; B = AAAAAAAAAA; B')
      
      // Should accept any 10-digit string
      expect(regex.accepts('1234567890')).toBe(true)
      expect(regex.accepts('0000000000')).toBe(true)
      expect(regex.accepts('9876543210')).toBe(true)
      
      // Should reject strings of wrong length
      expect(regex.accepts('123456789')).toBe(false)   // 9 digits
      expect(regex.accepts('12345678901')).toBe(false) // 11 digits
      expect(regex.accepts('')).toBe(false)            // empty
      
      // Should reject non-digits
      expect(regex.accepts('123456789a')).toBe(false)
      expect(regex.accepts('abcdefghij')).toBe(false)
    })

    test('should show correct substitution steps for consecutive variables', () => {
      const regex = new Regex('A = 0|1|2|3|4|5|6|7|8|9; B = AAAAAAAAAA; B')
      const steps = regex.getSubstitutionSteps()
      
      // Should have 3 steps: B -> (AAAAAAAAAA) -> (A)(A)(A)... with all As substituted
      expect(steps).toHaveLength(3)
      
      // Step 1: Just B
      expect(steps[0].expression).toBe('B')
      expect(steps[0].subexpressions).toBe('A = 0|1|2|3|4|5|6|7|8|9; B = AAAAAAAAAA;')
      
      // Step 2: B replaced with AAAAAAAAAA
      expect(steps[1].expression).toBe('(AAAAAAAAAA)')
      expect(steps[1].subexpressions).toBe('A = 0|1|2|3|4|5|6|7|8|9;')
      
      // Step 3: All As replaced with digit choices
      expect(steps[2].expression).toBe('((0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9)(0|1|2|3|4|5|6|7|8|9))')
      expect(steps[2].subexpressions).toBe('')
    })

    test('should extract correct input alphabet after full substitution', () => {
      const regex = new Regex('A = 0|1|2|3|4|5|6|7|8|9; B = AAAAAAAAAA; B')
      const alphabet = regex.getInputAlphabet()
      
      expect(alphabet).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
    })
  })
})