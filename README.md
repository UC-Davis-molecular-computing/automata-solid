# Automata Simulator

A modern TypeScript-based automata simulator built with SolidJS for visualizing and testing various computational models including Deterministic and Non-deterministic Finite Automata, Turing Machines, Context-Free Grammars, and Regular Expressions. The deployed app is here: [Automata Simulator](https://web.cs.ucdavis.edu/~doty/automata-ts/).

This was an exercise in vibe-coding for me; it was developed in about two days using Claude Code in August 2025. I wrote essentially no code.

## Features

### Supported Automaton Types
- **DFA (Deterministic Finite Automaton)** - Step-by-step state transitions with input processing
- **NFA (Non-deterministic Finite Automaton)** - Multiple state tracking and ε-transitions
- **TM (Turing Machine)** - Multi-tape visualization with head position tracking and string output
- **Regex (Regular Expression)** - Variable substitution and pattern matching
- **CFG (Context-Free Grammar)** - Parse tree generation and derivation visualization

### Core Functionality
- **Interactive Visualization** - Step through computations with forward/backward navigation
- **Real-time Testing** - Input strings and see immediate accept/reject results
- **YAML Configuration** - Define automata using clean, readable YAML syntax
- **Multi-mode Operation** - Choose between automatic computation or manual step-by-step execution
- **Responsive Design** - Works on desktop and mobile devices

### Turing Machine Features
- **Multi-tape Support** - Visualize TMs with multiple tapes
- **Head Position Tracking** - Clear indication of current tape head positions
- **String Output** - Display both Boolean (accept/reject) and string output from the last tape
- **Step-by-step Execution** - Navigate through each configuration

### User Interface
- **Split-panel Layout** - Edit automaton definitions on the left, view results on the right
- **Compact Visualization** - Optimized spacing for maximum content visibility
- **Unified Styling** - Consistent appearance across all automaton types
- **Input Controls** - String input with immediate result display
- **Navigation Controls** - Step forward/backward through computations

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view the application.

### Building for Production
```bash
npm run build
```
The build output will be in the `dist/` folder.

### Testing
```bash
npm run test:run
```

### Type Checking
```bash
npm run build  # Includes TypeScript type checking
# OR
npx tsc --noEmit  # Type checking only
```

## Project Structure

```
automata-ts/
├── src/
│   ├── core/              # Automata implementations
│   │   ├── DFA.ts         # Deterministic Finite Automaton
│   │   ├── NFA.ts         # Non-deterministic Finite Automaton
│   │   ├── TM.ts          # Turing Machine
│   │   ├── CFG.ts         # Context-Free Grammar
│   │   ├── Regex.ts       # Regular Expression
│   │   └── Utils.ts       # Shared utilities
│   ├── parsers/           # YAML parsers for each automaton type
│   ├── ui/                # SolidJS user interface
│   │   ├── components/    # Reusable UI components
│   │   ├── store/         # Application state management
│   │   └── types/         # TypeScript type definitions
│   └── tests/             # Unit tests
├── examples/              # Example automaton definitions
├── deploy.sh             # Deployment script
└── vite.config.ts        # Build configuration
```

## Usage

### Defining Automata
Automata are defined using YAML syntax. Here's a simple DFA example:

```yaml
states: [q0, q1, q2]
input_alphabet: [a, b]
start_state: q0
accept_states: [q2]
delta:
  q0:
    a: q1
    b: q0
  q1:
    a: q2
    b: q0
  q2:
    a: q2
    b: q2
```

### Testing Input Strings
1. Enter your automaton definition in the left panel
2. Type your test string in the input field
3. Choose "Run immediately?" for automatic computation or use the "Run" button for manual control
4. Use navigation controls (← → keys or buttons) to step through the computation
5. View results in the top control bar: accept/reject status and string output (for TMs)

### Turing Machine String Output
For Turing Machines, the simulator displays both:
- **Boolean output**: accept/reject based on final state
- **String output**: content from tape head to first blank on the last tape (displays "ε" for empty string)

### Navigation Controls
- **← (comma key)**: Step backward
- **→ (period key)**: Step forward  
- **|<<**: Go to beginning
- **>>|**: Go to end

### Keyboard Shortcuts
- **Ctrl+O**: Open file
- **Ctrl+S**: Save file
- **Ctrl+L**: Load default example

## Development

### Technology Stack
- **TypeScript** - Type-safe JavaScript development
- **SolidJS** - Reactive UI framework with fine-grained reactivity
- **Vite** - Fast build tool with HMR support
- **Vitest** - Testing framework
- **YAML** - Human-readable configuration format

### Architecture
The application follows the Elm Architecture pattern:
- **Model**: Centralized application state
- **View**: Pure reactive components
- **Update**: Message-based state updates

### Core Classes
- `DFA/NFA/TM/CFG/Regex`: Automaton implementations with `accepts()`, `statesVisited()`, and `configsVisited()` methods
- `*Parser`: YAML parsers with comprehensive error handling
- `*Component`: SolidJS components for visualization

### CSS Organization
- Unified table styling across all automaton types
- Responsive design with mobile support
- Compact spacing for maximum content visibility
- Consistent color scheme and highlighting

## Deployment

### Manual Deployment
```bash
npm run build
# Upload contents of dist/ to your web server
```

### Automated Deployment (UC Davis)
```bash
./deploy.sh
```
Builds and uploads to https://web.cs.ucdavis.edu/~doty/automata-ts/

## Contributing

1. Ensure TypeScript types are correct: `npm run build`
2. Run tests: `npm run test:run`
3. Follow existing code patterns and styling
4. Update tests for new functionality

## License

See LICENSE file for details.