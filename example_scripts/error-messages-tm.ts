#!/usr/bin/env tsx
/**
 * Script to compare TM parser error messages across different approaches
 * Run with: npx tsx examples/error-messages-tm.ts
 */

import { TMParser } from '../src/parsers/TMParser'

// Compare old and new TM parsers
const parsers = [
  { name: 'TM Parser', parser: new TMParser(), description: 'Original YAML source referencing with CST position tracking' }
]

// Complete collection of TM specifications for testing error messages and edge cases
const errorTestCases = [
  {
    name: "YAML Syntax Error - No closing bracket in states array",
    yaml: `
states: [q0, q1, qA, qR
input_alphabet: [0, 1]
tape_alphabet_extra: [x]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [q1, x, R]
`
  },
  {
    name: "YAML Syntax Error - Malformed input_alphabet",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0, 1
tape_alphabet_extra: [_]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
`
  },
  {
    name: "Missing Required Field - states",
    yaml: `
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
`
  },
  {
    name: "Missing Required Field - tape_alphabet_extra",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0, 1]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
`
  },
  {
    name: "Missing Required Field - delta",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
`
  },
  {
    name: "Empty states array",
    yaml: `
states: []
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
  },
  {
    name: "Empty input_alphabet array",
    yaml: `
states: [q0, qA, qR]
input_alphabet: []
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: {}
`
  },
  {
    name: "Valid TM without explicit blank symbol (auto-included)",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: [x, y]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, x, R]
`,
    shouldPass: true
  },
  {
    name: "Blank symbol in input_alphabet (forbidden)",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0, 1, _]
tape_alphabet_extra: [x]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, x, R]
`
  },
  {
    name: "Multi-character input symbol",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0, ab]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
`
  },
  {
    name: "Multi-character tape_alphabet_extra symbol",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: [abc]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, abc, R]
`
  },
  {
    name: "Duplicate states",
    yaml: `
states: [q0, q1, q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [q1, 0, R]
`
  },
  {
    name: "start_state not in states list",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q99
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
`
  },
  {
    name: "accept_state not in states list",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: q99
reject_state: qR
delta:
  q0:
    0: [qA, 0, R]
`
  },
  {
    name: "reject_state not in states list",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: q99
delta:
  q0:
    0: [qA, 0, R]
`
  },
  {
    name: "Overlapping input_alphabet and tape_alphabet_extra",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0, 1, x]
tape_alphabet_extra: [x]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, x, R]
`
  },
  {
    name: "Invalid transition format - wrong number of elements",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0]
`
  },
  {
    name: "Invalid transition format - extra elements",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, R, extra]
`
  },
  {
    name: "Invalid next state in transition",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [q99, 0, R]
`
  },
  {
    name: "Invalid output symbol in transition",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, y, R]
`
  },
  {
    name: "Invalid move direction",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, 0, X]
`
  },
  {
    name: "Transition from unknown state",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q99:
    0: [qA, 0, R]
`
  },
  {
    name: "Invalid input symbol in transition",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    z: [qA, 0, R]
`
  },
  {
    name: "Inconsistent number of tapes (2-tape then 1-tape)",
    yaml: `
states: [q0, q1, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0_: [q1, 0_, SR]
  q1:
    0: [qA, 0, R]
`
  },
  {
    name: "Wrong output symbols length for multi-tape",
    yaml: `
states: [q0, q1, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0_: [q1, 0, SR]
`
  },
  {
    name: "Wrong move directions length for multi-tape",
    yaml: `
states: [q0, q1, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0_: [q1, 0_, S]
`
  },
  {
    name: "Octal number issue - 00 parsed as 0",
    yaml: `
states: [q0, q1, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0_: [q1, 00, SR]
  q1:
    __: [qA, __, SS]
`
  },
  {
    name: "Special character warning - exclamation mark",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: [!]
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, !, R]
`
  },
  {
    name: "Special character warning - hash symbol",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: ['#']
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, '#', R]
`
  },
  {
    name: "Special character warning - asterisk",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: ['*']
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [qA, '*', R]
`
  },
  {
    name: "Extra unexpected property",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
unexpected_field: "This should not be here"
delta:
  q0:
    0: [qA, 0, R]
`
  },
  {
    name: "Non-string transition value",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: "not an array"
`
  },
  {
    name: "delta is null",
    yaml: `
states: [q0, qA, qR]
input_alphabet: [0]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta: null
`
  },
  {
    name: "Duplicate top-level key (start_state)",
    yaml: `
states: [q0, q1, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
start_state: q1    # Duplicate key!
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [q1, 1, R]
    1: [q0, 0, L]
  q1:
    0: [qA, 0, S]
    1: [qR, 1, S]
`
  },
  {
    name: "Duplicate state key in delta",
    yaml: `
states: [q0, q1, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [q1, 1, R]
    1: [q0, 0, L]
  q0:     # Duplicate key!
    0: [qA, 0, S]
    1: [qR, 1, S]
`
  },
  {
    name: "Duplicate transition key within a state",
    yaml: `
states: [q0, q1, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: []
start_state: q0
accept_state: qA
reject_state: qR
delta:
  q0:
    0: [q1, 1, R]
    1: [q0, 0, L]
    0: [qA, 0, S]   # Duplicate key!
  q1:
    0: [qA, 0, S]
    1: [qR, 1, S]
`
  },
  {
    name: "wrong number of symbols for number of tapes",
    yaml: `
# ^L00000101;Mx;

states: [write_initial_marker, read_next_instruction, load, reset_all_register_tapes, qA, qR]
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
    L??: [load, L???, RSSR]
    M???: [load, M???, RSSS]
    A???: [load, A???, RSSS]
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
`
  }
]

console.log('🧪 TM Parser Error Message Comparison\n')
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
      const tm = parser.parseTM(testCase.yaml)
      if (testCase.shouldPass) {
        console.log(`✅ PASSED - TM created successfully`)
      } else {
        console.log('⚠️  NO ERROR - This should have failed!')
      }
    } catch (error) {
      if (testCase.shouldPass) {
        console.log(`❌ UNEXPECTED ERROR - This should have passed: ${error instanceof Error ? error.message : String(error)}`)
      } else {
        if (error instanceof Error) {
          let message = error.message
          console.log(message)
        } else {
          console.log('Unknown error type:', error)
        }
      }
    }
    console.log('')
  }
  
  console.log('=' .repeat(80))
}

console.log('\n✅ TM Parser error message comparison complete!')
console.log('\n📊 SUMMARY:')
console.log('• OLD Parser: Uses better-ajv-errors visual positioning but references fake JSON file')
console.log('• NEW Parser: Maps errors back to original YAML source using CST position tracking')
console.log('• Compare the line/column references - OLD shows JSON positions, NEW shows YAML positions')
console.log('• Both provide excellent error context, but NEW references the actual source you typed')
console.log('\nTo run this script: npx tsx examples/error-messages-tm.ts')