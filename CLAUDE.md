# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript rewrite of an automata simulator web application. It is in the subdirectory 'automata-ts'. The project contains two reference implementations in different languages:
- `automata-ts-old/automata-dart/`: Dart implementation (imperative logic reference)
- `automata-ts-old/automata-elm/`: Elm implementation (UI architecture reference)

The TypeScript version should:
- Use **SolidJS** framework with **Elm Architecture** pattern (Model-View-Update)
- Follow imperative logic patterns from the Dart implementation
- Use **YAML format** for automata specifications instead of custom parsers
- Implement core automata classes: DFA, NFA, TM (Turing Machine), CFG, Regex

## Core Architecture

### Automata Classes Structure (from Dart reference)
- `AbstractAutomaton`: Base class with states, input alphabet, start state, accept states
- `DFA`: Deterministic Finite Automaton with transition function delta
- `NFA`: Non-deterministic Finite Automaton 
- `TM`: Turing Machine with tape operations
- `CFG`: Context-Free Grammar
- `Regex`: Regular Expression processor

### Key Methods (from automata-dart/lib/src/)
- `accepts(input: string)`: Test if automaton accepts input string
- `deltaExtended()`: Extended transition function for strings
- `statesVisited()`: Track states during string processing
- Validation methods for ensuring complete transition functions

### UI Architecture (Elm Architecture Pattern)
- **Model**: Top-level state object containing all application state
- **View**: Pure functions that render UI from model state
- **Update**: Message-based state updates (similar to Redux)
- Components: Code editor, automaton visualizer, test input panel

### Build System
- **Vite**: Modern build tool with fast HMR and TypeScript support
- **SolidJS**: Reactive UI framework with fine-grained reactivity
- **Vitest**: Testing framework integrated with Vite
- Development server runs on `http://localhost:5173/`

### File Format
- Replace custom parsers with YAML format
- Use `yaml` package (not `js-yaml`) for superior error positioning and CST support
- Maintain same logical structure as current formats
- Enhanced error messages with line:column positioning and code snippets

## Development Commands

### Main Project
```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173/)
npm run dev

# Build for production AND check for TypeScript errors
npm run build

# Check ONLY TypeScript errors without building (faster)
npx tsc --noEmit

# Preview production build locally
npm run preview

# Run tests ONCE and exit (recommended for Claude Code)
npm run test:run

# Alternative: Direct vitest command
# npx vitest run

# Run tests in watch mode (avoid in Claude Code - causes timeouts)
npm test

# Run tests with detailed output  
npx vitest run --reporter=verbose

# Run a Typescript script file directly
npx tsx examples\error-messages-nfa.ts
```

### ⚠️ Important Development Notes for Claude Code
- **Always use `npm run test:run`** to avoid watch mode timeouts
- **Why `test:run` is needed**: Default `npm test` enters watch mode and waits indefinitely for file changes
- **The problem**: Watch mode causes Claude Code commands to timeout after 2 minutes even though tests finish in ~1 second
- **Solution**: `npm run test:run` makes tests exit immediately after completion
- Use `npx vitest run --reporter=verbose` for detailed test output when debugging

### ⚠️ Playwright Testing Notes for Claude Code
- **Always use `npm run test:e2e:ci`** for playwright tests to avoid hanging
- **Why CI script is needed**: Direct `npx playwright test` opens HTML report that waits for user input
- **The problem**: HTML report server blocks the command until manually stopped with Ctrl+C
- **Solution**: `npm run test:e2e:ci` runs tests without opening the report server
- **Alternative**: Use `npx playwright test --reporter=line` for simple text output without HTML report

### ⚠️ Development Server Notes for Claude Code
- **Never run `npm run dev` directly** - this starts a local development server that requires manual interaction
- **Why this is problematic**: The dev server runs indefinitely and may open browser windows or require user input to stop
- **Solution**: Always ask the user to run `npm run dev` themselves and report what they observe
- **Proper workflow**: "Please run `npm run dev` and let me know what you see (any errors, warnings, or if it starts successfully)"`

### ⚠️ TypeScript Error Checking
- **Periodically run `npm run build`** to check for TypeScript compilation errors
- **Alternative**: Use `npx tsc --noEmit` for faster type-checking without building
- **Both commands now use the same `tsconfig.json`** - no configuration discrepancies
- **Why this matters**: Catches type errors, unused variables, invalid prop assignments, and other issues early
- **When to run**: After making significant code changes, before committing, or when VS Code shows TypeScript errors

### 🔍 Linter Error Checking
- **Run `npm run lint`** to check for ESLint errors and warnings
- **Errors must be fixed** - these prevent builds and indicate serious issues (unused variables, namespace usage, etc.)
- **Warnings can be addressed** - mostly code quality improvements (avoid `any` types, non-null assertions, etc.)
- **When to run**: Before committing, after making significant changes, or when fixing code quality issues
- **Fix priority**: Address errors first, then warnings for better code quality

### ⚠️ Critical Code Quality Rules for Claude Code
- **ALWAYS clean up compilation and lint errors** after making code changes
- **Never leave TypeScript errors or ESLint errors unaddressed** - these indicate serious issues
- **ALWAYS prevent all linter warnings** - warnings are unacceptable and must be fixed
- **Use the `assert` function from `src/core/Utils.ts`** to help with null/undefined checks and reduce linting warnings
- **The `assert` function signature**: `assert(condition: any, msg?: string): asserts condition`
- **NEVER use the `!` non-null assertion operator** - it only provides compile-time checking with no runtime validation
- **Example usage**: Instead of `obj!.property` (non-null assertion), use `assert(obj, 'obj should be defined'); obj.property`
- **Why assert is better**: The `assert` function provides both runtime validation (throws an error if condition is false) AND satisfies TypeScript's type checker, making the code safer and preventing linter warnings
- **Common patterns**:
  - Map lookups: `const value = map.get(key); assert(value, 'Value not found'); // use value safely`
  - Array access: `const item = array[index]; assert(item, 'Item not found'); // use item safely`
  - Optional chaining: `const result = obj?.method(); assert(result, 'Method returned null'); // use result safely`
- **When to run cleanup**: After implementing features, before committing, and as part of code review process

### 📋 TypeScript Configuration Simplified
- **Single `tsconfig.json`**: Contains all TypeScript settings for the entire project
- **Includes**: `src/**/*` (all source files) and `vite.config.ts` (build config)
- **No more multiple config files**: Removed the confusing `tsconfig.app.json` and `tsconfig.node.json` setup
- **Result**: `npx tsc --noEmit` and `npm run build` now use identical TypeScript settings

### ⚠️ Critical Dependency Management Rules for Claude Code
- **NEVER run `npm install <package>` directly** - this adds packages without updating package.json
- **ALWAYS edit package.json first** to add the dependency, then run `npm install`
- **Why this matters**: package.json must reflect ALL dependencies needed to run the project
- **Correct workflow**:
  1. Edit package.json to add dependency in `dependencies` or `devDependencies`
  2. Run `npm install` to install all dependencies from package.json
  3. This ensures the project is reproducible and all dependencies are tracked
- **Exception**: Only use `npm install <package>` if you need to verify it also updates package.json automatically

### Reference Implementations

#### Dart Reference (../automata-ts-old/automata-dart/)
```bash
# Build Dart version
cd ../automata-ts-old/automata-dart && dart pub get

# Run Dart tests  
cd ../automata-ts-old/automata-dart && dart test/main.dart
```

#### Elm Reference (../automata-ts-old/automata-elm/)
```bash
# Build Elm version
cd ../automata-ts-old/automata-elm && elm make src/Main.elm

# Run Elm tests
cd ../automata-ts-old/automata-elm/tests && elm-test
```

## Testing Strategy

Reference test files show comprehensive unit testing:
- `../automata-ts-old/automata-dart/test/DFA_test.dart`: Imperative test patterns
- `../automata-ts-old/automata-elm/tests/DFATest.elm`: Functional test patterns

Create TypeScript tests following Dart patterns but with Vitest testing framework.

## Development Phases

1. **Phase 1**: Implement DFA class with unit tests
2. **Phase 2**: Add YAML parsing for DFA specifications  
3. **Phase 3**: Implement remaining automata classes (NFA, TM, CFG, Regex)
4. **Phase 4**: Build SolidJS UI with Elm Architecture
5. **Phase 5**: Add visualization and interactive features

## Key Implementation Notes

- Maintain complete transition function validation (from Dart DFA implementation)
- Use Set operations for state management 
- Implement proper error handling for invalid automata specifications
- Follow functional programming patterns where possible while using TypeScript classes
- Ensure comprehensive input validation (alphabet checking, state validation)
- Use SolidJS signals for reactive state management
- Follow Vite conventions for module imports and asset handling

### Enhanced Error Handling

The YAML parser provides three levels of error reporting with precise positioning:

1. **YAML Syntax Errors**: Detailed positioning with code snippets showing exactly where syntax errors occur
2. **Schema Validation Errors**: JSON Schema violations mapped back to YAML line:column positions with context
3. **Semantic Validation Errors**: Logical errors with descriptive context (e.g., "start_state 'q2' is not in states array")

In particular, it is preferred to lean as much on existing packages as possible for error messages, and only write custom code for creating error messages when absolutely necessary. But before writing any custom code, we should check if existing packages can be used to create the necessary error messages. Ideally we would just specify the JSON schema and in that schema, would embed custom error messages to be used when the schema is violated.

**Example Enhanced Error**:
```
/states: must NOT have fewer than 1 items (2:9)
     2 | states: []
                     ^
```

This approach leverages the `yaml` package's LineCounter and CST (Concrete Syntax Tree) capabilities to provide user-friendly error messages that precisely pinpoint issues in YAML files.

## Project Structure

```
automata-ts/
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript compiler configuration
├── vite.config.ts        # Vite build tool configuration
├── vitest.config.ts      # Testing framework configuration (to be added)
├── index.html            # Main HTML entry point
├── CLAUDE.md             # This file - development guidance
├── public/               # Static assets
│   └── vite.svg
└── src/                  # TypeScript source code
    ├── index.tsx         # Application entry point
    ├── App.tsx           # Main app component
    ├── core/             # Automata classes (DFA, NFA, TM, CFG, Regex)
    ├── parsers/          # YAML parsing and validation
    ├── ui/               # SolidJS components and pages
    │   ├── components/   # Reusable UI components
    │   └── pages/        # Complete screens/views
    └── types/            # Shared TypeScript types
```

### File Organization Principles

- **`index.tsx`**: Application entry point that bootstraps the app
- **`App.tsx`**: Main application component with routing and layout
- **`ui/components/`**: Reusable UI building blocks (Button, CodeEditor, AutomatonVisualization)
- **`ui/pages/`**: Complete screens (DFASimulator, NFASimulator, HomePage)
- **`core/`**: Business logic and automata implementations
- **`parsers/`**: YAML parsing and validation logic
- **`types/`**: Shared TypeScript interfaces and types

## Session Context & Previous Work

**Previous Session Issues**: Manual Vite setup attempts failed, but the official `npm create vite@latest` workflow succeeded with SolidJS framework selection.

**Current Status**: Fresh Vite + SolidJS project created and working at `http://localhost:5173/`. Ready to migrate core logic from the old TypeScript attempt and reference implementations.

**Migration Priority**: 
1. Set up proper directory structure
2. Install required dependencies (js-yaml, vitest)
3. Copy relevant example files for testing
4. Implement DFA class following Dart patterns
5. Add YAML parsing capability
6. Build out SolidJS UI following Elm architecture patterns

This project represents a complete rewrite leveraging modern TypeScript tooling (Vite) with proven UI patterns (SolidJS + Elm Architecture) and established automata logic (Dart implementation).