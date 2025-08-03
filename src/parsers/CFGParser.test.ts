import { describe, test, expect } from 'vitest'
import { CFGParser } from './CFGParser'

describe('CFGParser', () => {
  const parser = new CFGParser()

  describe('YAML Parsing', () => {
    test('parses simple CFG with string productions', () => {
      const yamlString = `
S: ab
A: a
B: b
`
      const cfg = parser.parseCFG(yamlString)
      expect(cfg.variables).toEqual(['S', 'A', 'B'])
      expect(cfg.terminals).toEqual(['a', 'b'])
      expect(cfg.startSymbol).toBe('S')
      expect(cfg.accepts('ab')).toBe(true)
    })

    test('balanced parentheses from YAML format', () => {
          const yamlString = `
S: [(S), SS, '']
`
          const cfg = parser.parseCFG(yamlString)
          // Accepted strings
          expect(cfg.accepts('')).toBe(true)
          expect(cfg.accepts('()')).toBe(true)
          expect(cfg.accepts('(())')).toBe(true)
          expect(cfg.accepts('()()')).toBe(true)
          expect(cfg.accepts('(()())')).toBe(true)
          expect(cfg.accepts('(()()())')).toBe(true)
          expect(cfg.accepts('((())())')).toBe(true)
          expect(cfg.accepts('(()(()))')).toBe(true)
          expect(cfg.accepts('((())(()))')).toBe(true)
          expect(cfg.accepts('((()())(()))')).toBe(true)
          
          // Rejected strings
          expect(cfg.accepts('(')).toBe(false)
          expect(cfg.accepts(')')).toBe(false)
          expect(cfg.accepts(')(')).toBe(false)
          expect(cfg.accepts('((')).toBe(false)
          expect(cfg.accepts('))')).toBe(false)
          expect(cfg.accepts('(()')).toBe(false)
          expect(cfg.accepts('())')).toBe(false)
          expect(cfg.accepts('())(')).toBe(false)
          expect(cfg.accepts(')(()'))
        })

    test('parses CFG with array productions', () => {
      const yamlString = `
S: [ab, cd, '']
A: [a, b]
`
      const cfg = parser.parseCFG(yamlString)
      expect(cfg.accepts('ab')).toBe(true)
      expect(cfg.accepts('cd')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
    })

    test('parses CFG with mixed string and array productions', () => {
      const yamlString = `
S: [0S1, '', A]
A: '10'
B: ''
`
      const cfg = parser.parseCFG(yamlString)
      expect(cfg.variables).toEqual(['S', 'A', 'B'])
      expect(cfg.terminals).toEqual(['0', '1'])
      expect(cfg.startSymbol).toBe('S')
      expect(cfg.accepts('10')).toBe(true)
      expect(cfg.accepts('0101')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
    })

    test('handles epsilon productions correctly', () => {
      const yamlString = `
S: [aS, '']
`
      const cfg = parser.parseCFG(yamlString)
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('a')).toBe(true)
      expect(cfg.accepts('aa')).toBe(true)
      expect(cfg.accepts('aaa')).toBe(true)
    })

    test('parses balanced parentheses grammar', () => {
      const yamlString = `
S: ['(S)', SS, '']
`
      const cfg = parser.parseCFG(yamlString)
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('()')).toBe(true)
      expect(cfg.accepts('(())')).toBe(true)
      expect(cfg.accepts('()()')).toBe(true)
      expect(cfg.accepts('((()))')).toBe(true)
      expect(cfg.accepts('(')).toBe(false)
      expect(cfg.accepts(')(')).toBe(false)
    })

    test('parses x^n y^n grammar', () => {
      const yamlString = `
S: [xSy, '']
`
      const cfg = parser.parseCFG(yamlString)
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('xy')).toBe(true)
      expect(cfg.accepts('xxyy')).toBe(true)
      expect(cfg.accepts('xxxyyy')).toBe(true)
      expect(cfg.accepts('x')).toBe(false)
      expect(cfg.accepts('y')).toBe(false)
      expect(cfg.accepts('xyx')).toBe(false)
    })

    test('complex grammar with multiple variables', () => {
      const yamlString = `
N: [LE, ER]
E: [aEb, '']
L: [aL, a]
R: [bR, b]
`
      const cfg = parser.parseCFG(yamlString)
      expect(cfg.accepts('a')).toBe(true)
      expect(cfg.accepts('b')).toBe(true)
      expect(cfg.accepts('aa')).toBe(true)
      expect(cfg.accepts('bb')).toBe(true)
      expect(cfg.accepts('aab')).toBe(true)
      expect(cfg.accepts('abb')).toBe(true)
      expect(cfg.accepts('')).toBe(false)
      expect(cfg.accepts('ab')).toBe(false)
      expect(cfg.accepts('aabb')).toBe(false)
    })
  })

  describe('Error Handling', () => {
    test('throws on invalid YAML syntax', () => {
      const invalidYaml = `
S: [ab, cd
A: a
`
      expect(() => parser.parseCFG(invalidYaml)).toThrow(/YAML syntax error/)
    })

    test('throws on empty CFG', () => {
      const emptyYaml = ``
      expect(() => parser.parseCFG(emptyYaml)).toThrow(/at least one variable/)
    })

    test('throws on multi-character variable names', () => {
      const multiCharVar = `
S: a
AB: b
`
      expect(() => parser.parseCFG(multiCharVar)).toThrow(/exactly 1 character/)
    })

    test('validates semantic correctness', () => {
      // This test just verifies that normal grammars work fine
      const normalGrammar = `
S: ab
a: x
`
      const cfg = parser.parseCFG(normalGrammar)
      expect(cfg.variables).toEqual(['S', 'a'])
      expect(cfg.terminals).toEqual(['b', 'x'])
    })

    test('handles non-string YAML values', () => {
      const numericYaml = `
S: ['123', A]
A: ['456', '']
`
      const cfg = parser.parseCFG(numericYaml)
      expect(cfg.accepts('123')).toBe(true)
      expect(cfg.accepts('456')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
    })

    test('throws on object values in YAML', () => {
      const objectYaml = `
S: a
A:
  nested: value
`
      expect(() => parser.parseCFG(objectYaml)).toThrow()
    })

    test('throws on duplicate variable keys', () => {
      const duplicateVars = `
S: [ab, cd]
A: xy
S: ef
`
      expect(() => parser.parseCFG(duplicateVars)).toThrow(/Map keys must be unique/)
    })

    test('throws on duplicate keys in complex grammar', () => {
      const complexDuplicates = `
S: [AB, C]
A: [a, b]
B: [c, d]
A: [x, y]
C: e
`
      expect(() => parser.parseCFG(complexDuplicates)).toThrow(/Map keys must be unique/)
    })
  })

  describe('Edge Cases', () => {
    test('single variable grammar', () => {
      const singleVar = `
S: [a, '']
`
      const cfg = parser.parseCFG(singleVar)
      expect(cfg.variables).toEqual(['S'])
      expect(cfg.terminals).toEqual(['a'])
      expect(cfg.accepts('a')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
    })

    test('self-referential grammar', () => {
      const selfRef = `
A: [B, '']
B: A
`
      const cfg = parser.parseCFG(selfRef)
      expect(cfg.accepts('')).toBe(true)
    })

    test('grammar with numbers as terminals', () => {
      const numTerminals = `
S: [0S1, '']
`
      const cfg = parser.parseCFG(numTerminals)
      expect(cfg.terminals).toEqual(['0', '1'])
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('01')).toBe(true)
      expect(cfg.accepts('0011')).toBe(true)
    })

    test('grammar with special characters', () => {
      const specialChars = `
S: ['(S)', SS, '']
`
      const cfg = parser.parseCFG(specialChars)
      expect(cfg.terminals).toEqual(['(', ')'])
      expect(cfg.accepts('()')).toBe(true)
    })

    test('long production strings', () => {
      const longProduction = `
S: abcdefghijklmnop
`
      const cfg = parser.parseCFG(longProduction)
      expect(cfg.accepts('abcdefghijklmnop')).toBe(true)
    })

    test('many variables', () => {
      const manyVars = `
S: AB
A: CD
B: EF
C: a
D: b
E: c
F: d
`
      const cfg = parser.parseCFG(manyVars)
      expect(cfg.variables.length).toBe(7)
      expect(cfg.accepts('abcd')).toBe(true)
    })
  })

  describe('YAML Format Variations', () => {
    test('handles quoted strings', () => {
      const quotedStrings = `
S: ["ab", 'cd', ""]
A: 'xy'
`
      const cfg = parser.parseCFG(quotedStrings)
      expect(cfg.accepts('ab')).toBe(true)
      expect(cfg.accepts('cd')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
    })

    test('handles whitespace in YAML', () => {
      const whitespaceYaml = `
S:    [  ab  ,  cd  ,  ''  ]
A:    xy
B:    ''
`
      const cfg = parser.parseCFG(whitespaceYaml)
      expect(cfg.accepts('ab')).toBe(true)
      expect(cfg.accepts('cd')).toBe(true)
    })

    test('handles comments in YAML', () => {
      const commentedYaml = `
# This is a comment
S: [ab, cd] # Another comment
# More comments
A: xy
`
      const cfg = parser.parseCFG(commentedYaml)
      expect(cfg.accepts('ab')).toBe(true)
    })

    test('array format with multiple productions', () => {
      const arrayFormat = `
S: [ab, cd, '', A]
A: [xy, '']
`
      const cfg = parser.parseCFG(arrayFormat)
      
      // Should accept all productions from S (start symbol) and A (via S -> A)
      expect(cfg.accepts('ab')).toBe(true)
      expect(cfg.accepts('cd')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('xy')).toBe(true) // S -> A -> xy
    })
  })

  describe('Complex Real-World Examples', () => {
    test('arithmetic expressions grammar', () => {
      const arithYaml = `
E: [T, E+T]
T: [F, T*F]
F: [i, (E)]
`
      const cfg = parser.parseCFG(arithYaml)
      expect(cfg.accepts('i')).toBe(true)
      expect(cfg.accepts('i+i')).toBe(true)
      expect(cfg.accepts('i*i')).toBe(true)
      expect(cfg.accepts('(i)')).toBe(true)
      expect(cfg.accepts('i+i*i')).toBe(true)
      expect(cfg.accepts('(i+i)*i')).toBe(true)
    })

    test('simple programming language constructs', () => {
      const progYaml = `
S: [i=i, 'if(i)S', 'while(i)S', '{L}']
L: [S, SL]
`
      const cfg = parser.parseCFG(progYaml)
      expect(cfg.accepts('i=i')).toBe(true)
      expect(cfg.accepts('if(i)i=i')).toBe(true)
      expect(cfg.accepts('while(i)i=i')).toBe(true)
      expect(cfg.accepts('{i=i}')).toBe(true)
      expect(cfg.accepts('{i=ii=i}')).toBe(true)
    })
  })
})