import { describe, test, expect } from 'vitest'
import { CFGParser } from '../parsers/CFGParser'

describe('CFG Integration Tests', () => {
  describe('Alphabet Validation Integration', () => {
    test('should show proper error message for default CFG with invalid input', () => {
      // This tests the complete flow: YAML parsing -> CFG creation -> input validation
      const defaultCFGContent = `# CFG generating language of balanced () parentheses

S: [(S), SS, '']  # wrap in parentheses, concatenate, or empty`

      const parser = new CFGParser()
      const cfg = parser.parseCFG(defaultCFGContent)
      
      // Verify terminals are correctly parsed
      expect(cfg.terminals).toEqual(['(', ')'])
      expect(cfg.variables).toEqual(['S'])
      
      // Valid inputs should work
      expect(cfg.accepts('()')).toBe(true)
      expect(cfg.accepts('(())')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
      
      // Invalid alphabet symbols should throw descriptive errors
      expect(() => cfg.accepts('010'))
        .toThrow("symbol '0' not contained in alphabet {(,)}")
      expect(() => cfg.accepts('abc'))
        .toThrow("symbol 'a' not contained in alphabet {(,)}")
      expect(() => cfg.accepts('(a)'))
        .toThrow("symbol 'a' not contained in alphabet {(,)}")
    })
    
    test('should handle alphabet validation for different CFG types', () => {
      // Test with a different CFG that has different terminals
      const abCFGContent = `# CFG for equal number of a's and b's

S: [ab, ba, aSb, bSa, SS, '']`

      const parser = new CFGParser()
      const cfg = parser.parseCFG(abCFGContent)
      
      expect(cfg.terminals).toEqual(['a', 'b'])
      
      // Valid inputs
      expect(cfg.accepts('ab')).toBe(true)
      expect(cfg.accepts('aabb')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
      
      // Invalid alphabet symbols
      expect(() => cfg.accepts('abc'))
        .toThrow("symbol 'c' not contained in alphabet {a,b}")
      expect(() => cfg.accepts('123'))
        .toThrow("symbol '1' not contained in alphabet {a,b}")
    })

    test('should validate parseTree method as well', () => {
      const parser = new CFGParser()
      const cfg = parser.parseCFG(`S: [a]`)
      
      // Valid input should return parse tree
      const tree = cfg.parseTree('a')
      expect(tree).not.toBeNull()
      
      // Invalid alphabet should throw error
      expect(() => cfg.parseTree('b'))
        .toThrow("symbol 'b' not contained in alphabet {a}")
    })
  })
})