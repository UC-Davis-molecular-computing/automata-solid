#!/usr/bin/env node

/**
 * Command-line processor for automata submissions.
 * 
 * INFORMATION FLOW:
 * 1. Python's run_autograder.py calls this script via subprocess with:
 *    - submission_file: The student's .dfa/.nfa/.tm/.cfg/.regex file
 *    - inputs_json_file: Test inputs to run (can be empty [] for non_input_tests)
 *    - outputs_json_file: Where to write the results
 * 
 * 2. This script:
 *    - Parses the automaton from submission_file
 *    - Stores BOTH the parsed automaton instance (for running tests) AND
 *      a JSON representation in completeResult (for Python analysis)
 *    - Runs the automaton on test inputs
 *    - Writes everything to outputs_json_file
 * 
 * 3. Python reads outputs_json_file and passes it to problem_specific_module.non_input_tests()
 *    which can access the JSON automaton via process_input_results_dict['dfa'], etc.
 *    This allows Python to check automaton structure (state counts, transitions, etc.)
 * 
 * To compile this to a .js file, use: npm run build:process-inputs
 * 
 * After creating process_inputs.js, it should be copied to the autograder_engine repo root.
 * 
 * Usage: node process_inputs.js <submission_file> <inputs_json_file> <outputs_json_file>
 */

import * as fs from 'fs';
import * as path from 'path';
import { DFAParser } from './parsers/DFAParser';
import { NFAParser } from './parsers/NFAParser';
import { TMParser } from './parsers/TMParser';
import { CFGParser } from './parsers/CFGParser';
import { RegexParser } from './parsers/RegexParser';
import { DFA } from './core/DFA';
import { NFA } from './core/NFA';
import { Regex } from './core/Regex';
import { TM } from './core/TM';
import { CFG } from './core/CFG';

const EXTENSIONS = ['.dfa', '.nfa', '.regex', '.cfg', '.tm'];

interface TestInput {
  input: string;
  points?: number;
  correct_boolean_output?: boolean;
  correct_string_output?: string;
}

interface TestResult {
  input: string;
  submitted_boolean_output?: boolean;
  submitted_string_output?: string;
  error?: string;
}

// JSON representation interfaces for Python interop
interface DFAJson {
  states: string[];
  input_alphabet: string[];
  start_state: string;
  accept_states: string[];
  delta: Record<string, string>;
}

interface NFAJson {
  states: string[];
  input_alphabet: string[];
  start_state: string;
  accept_states: string[];
  delta: Record<string, string[]>;
}

interface RegexJson {
  source: string;
}

interface TMJson {
  states: string[];
  input_alphabet: string[];
  tape_alphabet: string[];
  start_state: string;
  accept_state: string;
  reject_state: string;
  delta: Record<string, [string, string, string]>;
}

interface CFGJson {
  variables: string[];
  terminals: string[];
  start_symbol: string;
  rules: Array<{
    in_symbol: string;
    out_symbols: string;
  }>;
}

interface CompleteResult {
  results?: TestResult[];
  error?: string;
  // JSON representations of automata for Python's non_input_tests to analyze structure
  dfa?: DFAJson;
  nfa?: NFAJson;
  regex?: RegexJson;
  tm?: TMJson;
  cfg?: CFGJson;
}

// Global result object - matches Dart implementation pattern
const completeResult: CompleteResult = {
  // All fields are optional and undefined by default
};

function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.log(`USAGE: npx tsx ${path.basename(import.meta.url)} <submission_file> <inputs_json_file> <outputs_json_file>\n\n` +
                `<submission_file> should end in one of ${EXTENSIONS.join(' ')}`);
    process.exit(-1);
  }

  console.log("***************\nfrom within node, command-line arguments to process_inputs.js are" +
              `\n<submission_file>   = ${args[0]}` +
              `\n<inputs_json_file>  = ${args[1]}` +
              `\n<outputs_json_file> = ${args[2]}` +
              "\n***************");

  const submissionFilename = args[0];
  const inputsFilename = args[1];
  const outputsFilename = args[2];

  try {
    // Read and parse the submission file
    const machine = readMachine(submissionFilename);
    
    // Read test inputs
    const testInputs = readInputs(inputsFilename);
    completeResult.results = testInputs;
    
    // Process each test input
    processInputs(machine);
    
    // Write results and exit
    printCurrentCompleteResultAndExit(outputsFilename);
    
  } catch (error) {
    if (error instanceof Error) {
      completeResult.error = error.message;
    } else {
      completeResult.error = String(error);
    }
    printCurrentCompleteResultAndExit(outputsFilename);
  }
}

function readMachine(filename: string): DFA | NFA | TM | CFG | Regex {
  let machineText: string;
  
  try {
    machineText = fs.readFileSync(filename, 'utf8');
  } catch (error) {
    const baseFilename = path.basename(filename);
    const fullFilename = path.resolve(filename);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`could not read ${baseFilename}\n` +
                   `make sure submission file ends in proper extension and that it is encoded in ANSI or UTF-8 and contains no non-ASCII characters\n` +
                   `full pathname of file searched for is ${fullFilename}\n` +
                   `original error: ${errorMessage}`);
  }

  const extension = path.extname(filename);
  
  try {
    switch (extension) {
      case '.dfa':
        const dfa = new DFAParser().parseDFA(machineText);
        // Store JSON for Python's non_input_tests to analyze (e.g., state count checks)
        completeResult.dfa = dfaToJson(dfa);
        return dfa;
        
      case '.nfa':
        const nfa = new NFAParser().parseNFA(machineText);
        // Store JSON for Python's non_input_tests to analyze (e.g., subset construction validation)
        completeResult.nfa = nfaToJson(nfa);
        return nfa;
        
      case '.tm':
        const tm = new TMParser().parseTM(machineText);
        // Store JSON for Python's non_input_tests to analyze (e.g., state count grading)
        completeResult.tm = tmToJson(tm);
        return tm;
        
      case '.cfg':
        const cfg = new CFGParser().parseCFG(machineText);
        // Store JSON for Python's non_input_tests to analyze (e.g., rule structure checks)
        completeResult.cfg = cfgToJson(cfg);
        return cfg;
        
      case '.regex':
        const regex = new RegexParser().parseRegex(machineText);
        // Store JSON for Python's non_input_tests to analyze
        completeResult.regex = regexToJson(regex);
        return regex;
        
      default:
        throw new Error(`extension must be one of ${EXTENSIONS.join(', ')}, but is ${extension}`);
    }
  } catch (error) {
    throw new Error(`error processing file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readInputs(inputsFilename: string): TestResult[] {
  let inputsText: string;
  
  try {
    inputsText = fs.readFileSync(inputsFilename, 'utf8');
  } catch (error) {
    throw new Error(`could not open test inputs file ${inputsFilename}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let inputsData: TestInput[];
  try {
    inputsData = JSON.parse(inputsText);
  } catch (error) {
    throw new Error(`error reading from test inputs file ${inputsFilename}: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Convert TestInput[] to TestResult[] format expected by downstream processing
  return inputsData.map(input => ({
    input: input.input,
    // Initialize fields that will be populated by processInputs
    submitted_boolean_output: undefined,
    submitted_string_output: undefined,
    error: undefined
  }));
}

function processInputs(machine: DFA | NFA | TM | CFG | Regex) {
  if (!completeResult.results) {
    throw new Error('No test results to process');
  }

  for (const result of completeResult.results) {
    const input = result.input;
    
    try {
      if (machine instanceof TM) {
        // Turing Machine: get both boolean and string output
        const { finalConfig } = machine.getConfigDiffsAndFinalConfig(input);
        const finalState = finalConfig.state;
        
        // Check if halted (accept or reject state)
        const halted = finalState === machine.acceptState || finalState === machine.rejectState;
        if (!halted) {
          throw new Error(`TM didn't halt on input ${input}`);
        }
        
        result.submitted_boolean_output = finalState === machine.acceptState;
        result.submitted_string_output = finalConfig.outputString();
        
      } else {
        // DFA, NFA, CFG: just boolean accept/reject
        result.submitted_boolean_output = machine.accepts(input);
      }
      
    } catch (error) {
      result.error = `error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

function dfaToJson(dfa: DFA): DFAJson {
  return {
    states: dfa.states,
    input_alphabet: dfa.inputAlphabet,
    start_state: dfa.startState,
    accept_states: dfa.acceptStates,
    delta: dfa.delta
  };
}

function nfaToJson(nfa: NFA): NFAJson {
  return {
    states: nfa.states,
    input_alphabet: nfa.inputAlphabet,
    start_state: nfa.startState,
    accept_states: nfa.acceptStates,
    delta: nfa.delta
  };
}

function regexToJson(regex: Regex): RegexJson {
  return {
    source: regex.source
  };
}

function cfgToJson(cfg: CFG): CFGJson {
  return {
    start_symbol: cfg.startSymbol,
    variables: cfg.variables,
    terminals: cfg.terminals,
    rules: cfg.rules.map(rule => ({
      in_symbol: rule.inputSymbol,
      out_symbols: rule.outputString
    }))
  };
}

function tmToJson(tm: TM): TMJson {
  return {
    states: tm.states,
    input_alphabet: tm.inputAlphabet,
    tape_alphabet: tm.tapeAlphabet,
    start_state: tm.startState,
    accept_state: tm.acceptState,
    reject_state: tm.rejectState,
    delta: tm.delta
  };
}

function printCurrentCompleteResultAndExit(outputsFilename: string) {
  try {
    const jsonString = JSON.stringify(completeResult, null, ' ');
    fs.writeFileSync(outputsFilename, jsonString);
    process.exit(0);
  } catch (error) {
    console.error(`Error writing output file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(-1);
  }
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}