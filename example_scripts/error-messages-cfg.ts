/**
 * Error message examples for CFG parser
 * Demonstrates various types of errors and their formatted messages
 */

import { CFGParser } from '../src/parsers/CFGParser'

const parser = new CFGParser()

console.log('=== CFG Parser Error Message Examples ===\n')

// Test cases that should produce various error messages
const testCases: { name: string, yaml: string }[] = [
  {
    name: "Invalid YAML Syntax - Missing closing bracket",
    yaml: `
S: [ab, cd
A: a
`
  },
  {
    name: "Empty CFG specification", 
    yaml: ``
  },
  {
    name: "Correct YAML for balanced parentheses", 
    yaml: `
S: [(S), SS, '']
`
  },
  {
    name: "Multi-character variable names",
    yaml: `
S: a
AB: b
CD: c
`
  },
  {
    name: "Variable-terminal conflict",
    yaml: `
S: Sa
a: b
`
  },
  {
    name: "Invalid YAML - malformed array",
    yaml: `
S: [ab, cd,
A: x
`
  },
  {
    name: "Invalid YAML - wrong indentation", 
    yaml: `
S: ab
  A: cd
B: ef
`
  },
  {
    name: "Complex conflict example",
    yaml: `
S: [AB, a]
A: [b, c]
B: [S, A]
a: d
`
  },
  {
    name: "Invalid object in production",
    yaml: `
S: a
A:
  nested: value
  another: item
`
  },
  {
    name: "Empty variable name (space)",
    yaml: `
S: a
 : b
`
  },
  {
    name: "Special characters in variable names",
    yaml: `
S: a
$: b
@: c
`
  },
  {
    name: "Duplicate variable names",
    yaml: `
S: [ab, cd]
A: xy
S: ef    # Duplicate key!
`
  },
  {
    name: "Duplicate keys in complex grammar",
    yaml: `
S: [AB, C]
A: [a, b]
B: [c, d]
A: [x, y]    # Duplicate key!
C: e
`
  }
]

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`)
  console.log('   YAML:')
  console.log(testCase.yaml.split('\n').map(line => '   ' + line).join('\n'))
  console.log('   Error:')
  
  try {
    parser.parseCFG(testCase.yaml)
    console.log('   ❌ Expected error but parsing succeeded')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log('   ' + errorMessage.split('\n').join('\n   '))
  }
  
  console.log('')
})

console.log('=== Valid CFG Examples (should not error) ===\n')

const validCases: { name: string, yaml: string, testString: string }[] = [
  {
    name: "Simple grammar",
    yaml: `
S: [ab, '']
`,
    testString: 'ab'
  },
  {
    name: "Balanced parentheses",
    yaml: `
S: ['(S)', SS, '']
`,
    testString: '(())'
  },
  {
    name: "x^n y^n",
    yaml: `
S: [xSy, '']
`,
    testString: 'xxyy'
  },
  {
    name: "At least as many a's as b's",
    yaml: `
N: LE
E: [aEb, '']
L: [aL, '']
`,
    testString: 'aaab'
  },
  {
    name: "Mixed format",
    yaml: `
S: [0S1, '', A]
A: '10'
`,
    testString: '010'
  }
]

validCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`)
  console.log('   YAML:')
  console.log(testCase.yaml.split('\n').map(line => '   ' + line).join('\n'))
  
  try {
    const cfg = parser.parseCFG(testCase.yaml)
    const accepts = cfg.accepts(testCase.testString)
    console.log(`   ✅ Parsed successfully`)
    console.log(`   Variables: ${cfg.variables.join(', ')}`)
    console.log(`   Terminals: ${cfg.terminals.join(', ')}`)
    console.log(`   Start symbol: ${cfg.startSymbol}`)
    console.log(`   Accepts "${testCase.testString}": ${accepts}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log('   ❌ Unexpected error:')
    console.log('   ' + errorMessage.split('\n').join('\n   '))
  }
  
  console.log('')
})

console.log('=== Parse Tree Examples ===\n')

const parseTreeCases: { name: string, yaml: string, input: string }[] = [
  {
    name: "Simple parse tree",
    yaml: `
S: ab
`,
    input: 'ab'
  },
  {
    name: "Balanced parentheses parse tree",
    yaml: `
S: ['(A)', '']
A: [SS, '']
`,
    input: '(())'
  },
  {
    name: "Recursive structure",
    yaml: `
S: [aSa, b]
`,
    input: 'ababa'
  }
]

parseTreeCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`)
  console.log('   YAML:')
  console.log(testCase.yaml.split('\n').map(line => '   ' + line).join('\n'))
  console.log(`   Input: "${testCase.input}"`)
  
  try {
    const cfg = parser.parseCFG(testCase.yaml)
    const tree = cfg.parseTree(testCase.input)
    
    if (tree) {
      console.log('   ✅ Parse tree:')
      console.log(tree.toTreeString().split('\n').map(line => '   ' + line).join('\n'))
    } else {
      console.log('   ❌ Input rejected - no parse tree')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log('   ❌ Error:')
    console.log('   ' + errorMessage.split('\n').join('\n   '))
  }
  
  console.log('')
})

console.log('Done.')