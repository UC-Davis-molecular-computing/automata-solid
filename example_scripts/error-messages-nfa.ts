#!/usr/bin/env tsx
/**
 * Script to compare NFA parser error messages across different approaches
 * Run with: npx tsx examples/error-messages-nfa.ts
 */

import { NFAParser } from '../src/parsers/NFAParser'

// Compare old and new NFA parsers
const parsers = [
  { name: 'NFA Parser', parser: new NFAParser(), description: 'Original YAML source referencing with CST position tracking' }
]

// Complete collection of invalid NFA specifications with descriptions
const errorTestCases = [
  {
    name: "No closing bracket in states array",
    yaml: `
states: [q0, q1
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
    epsilon: [q1]
`
  },
  {
    name: "Missing required field (states)",
    yaml: `
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
    epsilon: [q1]
`
  },
  {
    name: "Missing required field (start_state)",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
    epsilon: [q1]
`
  },
  {
    name: "Empty states array",
    yaml: `
states: []
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta: {}
`
  },
  {
    name: "Multi-character alphabet symbol",
    yaml: `
states: [q0]
input_alphabet: [ab, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    ab: [q0]
    1: [q0]
`
  },
  {
    name: "Duplicate states",
    yaml: `
states: [q0, q1, q2, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
    epsilon: [q1]
  q1:
    0: [q0]
    1: [q1]
  q2:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "Duplicate symbols",
    yaml: `
states: [q0, q1, q2]
input_alphabet: [0, 1, 2, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
    2: [q1]
    epsilon: [q1]
  q1:
    0: [q0]
    1: [q1]
    2: [q1]
  q2:
    0: [q0]
    1: [q1]
    2: [q1]
`
  },
  {
    name: "Start state not in states array",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q2
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
  q1:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "Accept state not in states array",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0, q2]
delta:
  q0:
    0: [q0]
    1: [q1]
  q1:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "Transition from unknown state",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
  q1:
    0: [q0]
    1: [q1]
  q2:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "Transition to unknown state",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q2]
    1: [q1]
  q1:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "Transition with unknown symbol",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
    2: [q1]
  q1:
    0: [q0]
    1: [q1]
    2: [q1]
`
  },
  {
    name: "accept_states without brackets (not an array)",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: q0, q1
delta:
  q0:
    0: [q0]
    1: [q1]
  q1:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "Empty string in input_alphabet",
    yaml: `
states: [q0, q1]
input_alphabet: ['', 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    '': [q0]
    1: [q1]
  q1:
    '': [q0]
    1: [q1]
`
  },
  {
    name: "states without brackets (not an array)",
    yaml: `
states: q0, q1
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
  q1:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "input_alphabet without brackets (not an array)",
    yaml: `
states: [q0, q1]
input_alphabet: 0, 1
start_state: q0
accept_states: [q0]
delta:
  q0:
    0: [q0]
    1: [q1]
  q1:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "Extra unexpected property",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
unexpected_property: "This should not be here"
delta:
  q0:
    0: [q0]
    1: [q1]
  q1:
    0: [q0]
    1: [q1]
`
  },
  {
    name: "delta is null",
    yaml: `
states: [q0, q1]
input_alphabet: [0, 1]
start_state: q0
accept_states: [q0]
delta: null
`
  },
  {
    name: "Duplicate top-level key (start_state)",
    yaml: `
states: [q0, q1]
input_alphabet: [a, b]
start_state: q0
start_state: q1    # Duplicate key!
accept_states: [q1]
delta:
  q0:
    a: [q0, q1]
    b: [q0]
  q1:
    a: [q1]
    b: [q1]
`
  },
  {
    name: "Duplicate state key in delta",
    yaml: `
states: [q0, q1]
input_alphabet: [a, b]
start_state: q0
accept_states: [q1]
delta:
  q0:
    a: [q0, q1]
    b: [q0]
  q0:     # Duplicate key!
    a: [q1]
    b: [q1]
`
  },
  {
    name: "Duplicate transition key within a state",
    yaml: `
states: [q0, q1]
input_alphabet: [a, b]
start_state: q0
accept_states: [q1]
delta:
  q0:
    a: [q0, q1]
    b: q0
    a: q1   # Duplicate key!
  q1:
    a: q1
    b: q1
`
  },
  {
    name: "unmatched brackets in delta",
    yaml: `
# NFA recognizing { x in {0,1}* | third-to-last bit of x is 0 }

states: [q1, q2, q3, q4]
input_alphabet: [0, 1]
start_state: q1
accept_states: [q4]

delta:
  q1:
    0: [q1, q2]
    1: q1]
  q2:
    '': q1
    0: q3
    1: q3
  q3:
    0: q4
    1: q4
`
  },
]

console.log('🧪 NFA Parser Error Message Comparison\n')
console.log('='.repeat(80))

parsers.forEach((p, i) => {
  console.log(`${i + 1}. ${p.name}: ${p.description}`)
})

console.log('\n' + '='.repeat(80))

for (let i = 0; i < errorTestCases.length; i++) {
  const testCase = errorTestCases[i]
  
  console.log(`\n📋 TEST CASE ${i + 1}: ${testCase.name}`)
  console.log('-'.repeat(60))
  
  console.log('📄 YAML Content:')
  console.log(testCase.yaml.trim())
  console.log('')
  
  for (const { name, parser } of parsers) {
    console.log(`🔍 ${name}:`)
    console.log('─'.repeat(30))
    
    try {
      parser.parseNFA(testCase.yaml)
      console.log('⚠️  NO ERROR - This should have failed!')
    } catch (error) {
      if (error instanceof Error) {
        let message = error.message
        console.log(message)
      } else {
        console.log('Unknown error type:', error)
      }
    }
    console.log('')
  }
  
  console.log('=' .repeat(80))
}

console.log('\n✅ NFA Parser error message comparison complete!')
console.log('\n📊 SUMMARY:')
console.log('• OLD Parser: Uses better-ajv-errors visual positioning but references fake JSON file')
console.log('• NEW Parser: Maps errors back to original YAML source using CST position tracking')
console.log('• Compare the line/column references - OLD shows JSON positions, NEW shows YAML positions')
console.log('• Both provide excellent error context, but NEW references the actual source you typed')
console.log('\nTo run this script: npx tsx examples/error-messages-nfa.ts')