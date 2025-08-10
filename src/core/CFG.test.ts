import { describe, test, expect } from 'vitest'
import { CFG, Rule, Row, Chart, TreeNode, EPSILON } from './CFG'
import { assert } from './Utils'

describe('CFG', () => {
  describe('Rule', () => {
    test('constructor with multiple input symbols throws error', () => {
      expect(() => new Rule('AB', 'BC')).toThrow(/exactly 1 input symbol/)
    })

    test('creates rule with string output', () => {
      const rule = new Rule('S', 'abc')
      expect(rule.inputSymbol).toBe('S')
      expect(rule.outputString).toBe('abc')
      expect(rule.length).toBe(3)
    })

    test('creates rule with array output', () => {
      const rule = new Rule('S', ['a', 'b', 'c'])
      expect(rule.inputSymbol).toBe('S')
      expect(rule.outputString).toBe('abc')
      expect(rule.length).toBe(3)
    })

    test('epsilon rule', () => {
      const rule = new Rule('S', '')
      expect(rule.isEpsilon()).toBe(true)
      expect(rule.length).toBe(0)
    })

    test('toString formats correctly', () => {
      const rule1 = new Rule('S', 'abc')
      const rule2 = new Rule('A', '')
      expect(rule1.toString()).toBe('S -> abc')
      expect(rule2.toString()).toBe(`A -> ${EPSILON}`)
    })
  })

  describe('CFG Constructor', () => {
    test('mixing terminals and variables throws error', () => {
      expect(() => new CFG(['S', 'A', 'B'], ['x', 'y', 'A'], [], 'S'))
        .toThrow(/terminals and variables cannot intersect/)
    })

    test('start symbol not in variables throws error', () => {
      expect(() => new CFG(['S', 'A', 'B'], ['x', 'y', 'z'], [], 'W'))
        .toThrow(/variables must contain start_symbol/)
    })

    test('creates valid CFG', () => {
      const rules = [
        new Rule('S', 'AB'),
        new Rule('A', 'a'),
        new Rule('B', 'b')
      ]
      const cfg = new CFG(['a', 'b'], ['S', 'A', 'B'], rules, 'S')
      
      expect(cfg.terminals).toEqual(['a', 'b'])
      expect(cfg.variables).toEqual(['S', 'A', 'B'])
      expect(cfg.startSymbol).toBe('S')
      expect(cfg.rules).toEqual(rules)
    })
  })

  describe('Row', () => {
    test('creates row correctly', () => {
      const rule = new Rule('S', 'abc')
      const row = new Row(rule, 1, 0)
      
      expect(row.rule).toBe(rule)
      expect(row.dotPosition).toBe(1)
      expect(row.inputStartPosition).toBe(0)
      expect(row.scannedString()).toBe('a')
      expect(row.unscannedString()).toBe('bc')
      expect(row.nextSymbol()).toBe('b')
    })

    test('validates dot position', () => {
      const rule = new Rule('S', 'abc')
      expect(() => new Row(rule, -1, 0)).toThrow(/dotPosition.*must be between/)
      expect(() => new Row(rule, 4, 0)).toThrow(/dotPosition.*must be between/)
    })

    test('isComplete works correctly', () => {
      const rule = new Rule('S', 'abc')
      const row1 = new Row(rule, 2, 0)
      const row2 = new Row(rule, 3, 0)
      
      expect(row1.isComplete()).toBe(false)
      expect(row2.isComplete()).toBe(true)
    })
  })

  describe('Chart', () => {
    test('adds unique rows only', () => {
      const rule = new Rule('S', 'a')
      const chart = new Chart()
      const row1 = new Row(rule, 0, 0)
      const row2 = new Row(rule, 0, 0) // duplicate
      const row3 = new Row(rule, 1, 0) // different
      
      chart.addRow(row1)
      chart.addRow(row2)
      chart.addRow(row3)
      
      expect(chart.length).toBe(2) // Only row1 and row3
    })
  })

  describe('Basic CFG acceptance', () => {
    test('empty string with loop in nonterminal graph', () => {
      const rules = [
        new Rule('A', ''),
        new Rule('A', 'B'),
        new Rule('B', 'A')
      ]
      const cfg = new CFG([], ['A', 'B'], rules, 'A')
      
      expect(cfg.accepts('')).toBe(true)
    })

    test('simple terminal acceptance', () => {
      const rules = [
        new Rule('S', 'a')
      ]
      const cfg = new CFG(['a'], ['S'], rules, 'S')
      
      expect(cfg.accepts('a')).toBe(true)
      expect(cfg.accepts('')).toBe(false)
      // 'b' should throw error since it's not in terminal alphabet
      expect(() => cfg.accepts('b')).toThrow(/symbol 'b' not contained in alphabet/)
      expect(cfg.accepts('aa')).toBe(false)
    })

    test('at least as many as as bs', () => {
      const rules = [
        new Rule('N', 'LE'),
        new Rule('E', 'aEb'),
        new Rule('E', ''),
        new Rule('L', 'aL'),
        new Rule('L', '')
      ]
      const cfg = new CFG(['a', 'b'], ['N', 'E', 'L'], rules, 'N')
      
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('a')).toBe(true)
      expect(cfg.accepts('aa')).toBe(true)
      expect(cfg.accepts('aaa')).toBe(true)
      expect(cfg.accepts('ab')).toBe(true)
      expect(cfg.accepts('aab')).toBe(true)
      expect(cfg.accepts('aaab')).toBe(true)
      expect(cfg.accepts('aabb')).toBe(true)
      expect(cfg.accepts('aaabb')).toBe(true)
      expect(cfg.accepts('aaaabb')).toBe(true)
      
      expect(cfg.accepts('b')).toBe(false)
      expect(cfg.accepts('abb')).toBe(false)
      expect(cfg.accepts('aabbb')).toBe(false)
    })

    test('more as than bs', () => {
      const rules = [
        new Rule('N', 'LE'),
        new Rule('E', 'aEb'),
        new Rule('E', ''),
        new Rule('L', 'aL'),
        new Rule('L', 'a')
      ]
      const cfg = new CFG(['a', 'b'], ['N', 'E', 'L'], rules, 'N')
      
      expect(cfg.accepts('a')).toBe(true)
      expect(cfg.accepts('aa')).toBe(true)
      expect(cfg.accepts('aaa')).toBe(true)
      
      expect(cfg.accepts('')).toBe(false)
    })

    test('unequal number of as and bs', () => {
      const rules = [
        new Rule('N', 'LE'),
        new Rule('N', 'ER'),
        new Rule('E', 'aEb'),
        new Rule('E', ''),
        new Rule('L', 'aL'),
        new Rule('L', 'a'),
        new Rule('R', 'bR'),
        new Rule('R', 'b')
      ]
      const cfg = new CFG(['a', 'b'], ['N', 'E', 'L', 'R'], rules, 'N')
      
      expect(cfg.accepts('a')).toBe(true)
      expect(cfg.accepts('b')).toBe(true)
      expect(cfg.accepts('aa')).toBe(true)
      expect(cfg.accepts('bb')).toBe(true)
      expect(cfg.accepts('aaa')).toBe(true)
      expect(cfg.accepts('bbb')).toBe(true)
      expect(cfg.accepts('aab')).toBe(true)
      expect(cfg.accepts('abb')).toBe(true)
      
      expect(cfg.accepts('')).toBe(false)
      expect(cfg.accepts('ab')).toBe(false)
      expect(cfg.accepts('aabb')).toBe(false)
    })
  })

  describe('Epsilon rules and edge cases', () => {
    test('grammar broken by lack of epsilon-rule special case', () => {
      const rules = [
        new Rule('T', 'S'),
        new Rule('S', 'AAAA'),
        new Rule('A', 'a'),
        new Rule('A', 'E'),
        new Rule('E', '')
      ]
      const cfg = new CFG(['a'], ['T', 'S', 'A', 'E'], rules, 'T')
      
      expect(cfg.accepts('a')).toBe(true)
    })

    test('parser with epsilon rules', () => {
      const rules = [
        new Rule('S', 'AAAA'),
        new Rule('A', 'a'),
        new Rule('A', 'E'),
        new Rule('E', '')
      ]
      const cfg = new CFG(['a'], ['S', 'A', 'E'], rules, 'S')
      
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('a')).toBe(true)
      expect(cfg.accepts('aa')).toBe(true)
      expect(cfg.accepts('aaa')).toBe(true)
      expect(cfg.accepts('aaaa')).toBe(true)
    })
  })

  describe('Complex grammars', () => {
    test('x* (Kleene star)', () => {
      const rules = [
        new Rule('S', 'xS'),
        new Rule('S', '')
      ]
      const cfg = new CFG(['x'], ['S'], rules, 'S')
      
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('x')).toBe(true)
      expect(cfg.accepts('xx')).toBe(true)
      expect(cfg.accepts('xxx')).toBe(true)
      expect(cfg.accepts('xxxx')).toBe(true)
      expect(cfg.accepts('xxxxx')).toBe(true)
    })

    test('balanced parentheses', () => {
      const rules = [
        new Rule('S', '(S)'),
        new Rule('S', 'SS'),
        new Rule('S', '')
      ]
      const cfg = new CFG(['(', ')'], ['S'], rules, 'S')
      
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

    test('x^n y^n', () => {
      const rules = [
        new Rule('S', 'xSy'),
        new Rule('S', '')
      ]
      const cfg = new CFG(['x', 'y'], ['S'], rules, 'S')
      
      // Accepted strings
      expect(cfg.accepts('')).toBe(true)
      expect(cfg.accepts('xy')).toBe(true)
      expect(cfg.accepts('xxyy')).toBe(true)
      expect(cfg.accepts('xxxyyy')).toBe(true)
      expect(cfg.accepts('xxxxyyyy')).toBe(true)
      
      // Rejected strings
      expect(cfg.accepts('x')).toBe(false)
      expect(cfg.accepts('y')).toBe(false)
      expect(cfg.accepts('xx')).toBe(false)
      expect(cfg.accepts('yx')).toBe(false)
      expect(cfg.accepts('yy')).toBe(false)
      expect(cfg.accepts('xxx')).toBe(false)
      expect(cfg.accepts('xxy')).toBe(false)
      expect(cfg.accepts('xyx')).toBe(false)
      expect(cfg.accepts('xyy')).toBe(false)
      expect(cfg.accepts('yxx')).toBe(false)
      expect(cfg.accepts('yxy')).toBe(false)
      expect(cfg.accepts('yyx')).toBe(false)
      expect(cfg.accepts('yyy')).toBe(false)
      expect(cfg.accepts('xxxx')).toBe(false)
      expect(cfg.accepts('xxxy')).toBe(false)
      expect(cfg.accepts('xxyx')).toBe(false)
      expect(cfg.accepts('xyxx')).toBe(false)
      expect(cfg.accepts('xyxy')).toBe(false)
      expect(cfg.accepts('xyyx')).toBe(false)
      expect(cfg.accepts('xyyy')).toBe(false)
      expect(cfg.accepts('yxxx')).toBe(false)
      expect(cfg.accepts('yxxy')).toBe(false)
      expect(cfg.accepts('yxyx')).toBe(false)
      expect(cfg.accepts('yxyy')).toBe(false)
      expect(cfg.accepts('yyxx')).toBe(false)
      expect(cfg.accepts('yyxy')).toBe(false)
      expect(cfg.accepts('yyyx')).toBe(false)
      expect(cfg.accepts('yyyy')).toBe(false)
    })
  })

  describe('Nullable symbols', () => {
    test('nullable detection', () => {
      const rules = [
        new Rule('S', 'ABC'),
        new Rule('A', 'xy'),
        new Rule('A', 'BxC'),
        new Rule('B', 'xyz'),
        new Rule('B', 'D'),
        new Rule('C', ''),
        new Rule('D', ''),
        new Rule('E', 'FG'),
        new Rule('F', ''),
        new Rule('G', 'x')
      ]
      const cfg = new CFG(['x', 'y', 'z'], ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], rules, 'S')
      
      expect(cfg.isNullable('S')).toBe(false)
      expect(cfg.isNullable('A')).toBe(false)
      expect(cfg.isNullable('B')).toBe(true)
      expect(cfg.isNullable('C')).toBe(true)
      expect(cfg.isNullable('D')).toBe(true)
      expect(cfg.isNullable('E')).toBe(false)
      expect(cfg.isNullable('F')).toBe(true)
      expect(cfg.isNullable('G')).toBe(false)
    })
  })

  describe('Input Alphabet Validation', () => {
    test('should throw error when input contains symbols not in terminal alphabet', () => {
      // CFG for balanced parentheses - terminals are ( and )
      const rules = [
        new Rule('S', '(S)'),
        new Rule('S', 'SS'),
        new Rule('S', '')
      ]
      const cfg = new CFG(['(', ')'], ['S'], rules, 'S')
      
      // Input '010' contains symbols not in terminal alphabet {(, )}
      expect(() => cfg.accepts('010')).toThrow(/symbol '[01]' not contained in alphabet/)
    })
    
    test('should accept valid input with symbols in terminal alphabet', () => {
      const rules = [
        new Rule('S', '(S)'),
        new Rule('S', 'SS'), 
        new Rule('S', '')
      ]
      const cfg = new CFG(['(', ')'], ['S'], rules, 'S')
      
      // These inputs only use symbols from terminal alphabet
      expect(cfg.accepts('()')).toBe(true)
      expect(cfg.accepts('(())')).toBe(true)
      expect(cfg.accepts('')).toBe(true)
    })
  })

  describe('Parse Trees', () => {
    test('simple terminal parse tree', () => {
      const rules = [new Rule('S', 'a')]
      const cfg = new CFG(['a'], ['S'], rules, 'S')
      
      const tree = cfg.parseTree('a')
      expect(tree).toBeDefined()
      assert(tree !== undefined, 'Parse tree should not be undefined')
      expect(tree.symbol).toBe('S')
      expect(tree.children.length).toBe(1)
      expect(tree.children[0].symbol).toBe('a')
    })

    test('two terminals parse tree', () => {
      const rules = [new Rule('S', 'ab')]
      const cfg = new CFG(['a', 'b'], ['S'], rules, 'S')
      
      const tree = cfg.parseTree('ab')
      expect(tree).toBeDefined()
      assert(tree !== undefined, 'Parse tree should not be undefined')
      expect(tree.symbol).toBe('S')
      expect(tree.children.length).toBe(2)
      expect(tree.children[0].symbol).toBe('a')
      expect(tree.children[1].symbol).toBe('b')
    })

    test('epsilon parse tree', () => {
      const rules = [
        new Rule('S', '(S)'),
        new Rule('S', 'SS'),
        new Rule('S', '')
      ]
      const cfg = new CFG(['(', ')'], ['S'], rules, 'S')
      
      const tree = cfg.parseTree('')
      expect(tree).toBeDefined()
      assert(tree !== undefined, 'Parse tree should not be undefined')
      expect(tree.symbol).toBe('S')
      expect(tree.children.length).toBe(1)
      expect(tree.children[0].symbol).toBe(EPSILON)
    })

    test('balanced parentheses parse tree', () => {
      const rules = [
        new Rule('S', '(A)'),
        new Rule('A', 'SS'),
        new Rule('A', '')
      ]
      const cfg = new CFG(['(', ')'], ['S', 'A'], rules, 'S')
      
      const tree = cfg.parseTree('()')
      expect(tree).toBeDefined()
      assert(tree !== undefined, 'Parse tree should not be undefined')
      expect(tree.symbol).toBe('S')
      expect(tree.children.length).toBe(3)
      expect(tree.children[0].symbol).toBe('(')
      expect(tree.children[1].symbol).toBe('A')
      expect(tree.children[2].symbol).toBe(')')
      expect(tree.children[1].children.length).toBe(1)
      expect(tree.children[1].children[0].symbol).toBe(EPSILON)
    })

    test('rejected string returns null parse tree', () => {
      const rules = [
        new Rule('S', '(S)'),
        new Rule('S', 'SS'),
        new Rule('S', '')
      ]
      const cfg = new CFG(['(', ')'], ['S'], rules, 'S')
      
      expect(cfg.parseTree('(((')).toBeUndefined()
      expect(cfg.parseTree(')))')).toBeUndefined()
      expect(cfg.parseTree(')(')).toBeUndefined()
      expect(cfg.parseTree('(()')).toBeUndefined()
    })
  })

  describe('TreeNode', () => {
    test('creates tree structure correctly', () => {
      const root = new TreeNode('R')
      const childA = new TreeNode('A', { parent: root })
      const childB = new TreeNode('B', { parent: root })
      root.children = [childA, childB]

      expect(root.symbol).toBe('R')
      expect(root.children.length).toBe(2)
      expect(childA.parent).toBe(root)
      expect(childB.parent).toBe(root)
    })

    test('equality works correctly', () => {
      const tree1 = new TreeNode('S', { 
        children: [new TreeNode('a'), new TreeNode('b')] 
      })
      const tree2 = new TreeNode('S', { 
        children: [new TreeNode('a'), new TreeNode('b')] 
      })
      const tree3 = new TreeNode('S', { 
        children: [new TreeNode('a')] 
      })

      expect(tree1.equals(tree2)).toBe(true)
      expect(tree1.equals(tree3)).toBe(false)
    })

    test('tree string representation', () => {
      const root = new TreeNode('R')
      const childA = new TreeNode('A', { parent: root })
      const childB = new TreeNode('B', { parent: root })
      root.children = [childA, childB]

      const treeStr = root.toTreeString()
      expect(treeStr).toContain('R')
      expect(treeStr).toContain('A')
      expect(treeStr).toContain('B')
      expect(treeStr).toContain('└')
      expect(treeStr).toContain('├')
    })
  })
})