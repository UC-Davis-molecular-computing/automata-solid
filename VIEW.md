# Automaton Simulator UI Structure

This document describes the complete HTML view structure for the SolidJS implementation, based on the Elm reference implementation.

## Existing Elm Automaton Simulator UI Structure

## Overall Layout

The application has two main modes:
1. **Embedded mode**: Simplified layout for embedding
2. **Full mode**: Complete interface with split-pane layout

### Full Mode Structure

```
<div style="height: 100%">
  ├── topView (header controls and navigation)
  └── bottomView (split-pane with editor and results)
```

## Top View (Header)

**Layout**: Horizontal flexbox `display: flex, flex-direction: row`

### Components (left to right):

1. **Menu Bar** (using Kobalte DropdownMenu components)
   ```html
   <div class="menu-bar">
     <!-- File Menu -->
     <DropdownMenu>
       <DropdownMenu.Trigger>File</DropdownMenu.Trigger>
       <DropdownMenu.Content>
         <!-- Load Default, Open, Save, Minimize DFA (conditional) -->
       </DropdownMenu.Content>
     </DropdownMenu>
     
     <!-- Model Menu -->
     <DropdownMenu>
       <DropdownMenu.Trigger>Model</DropdownMenu.Trigger>
       <DropdownMenu.Content>
         <DropdownMenu.RadioGroup>
           <!-- DFA, NFA, Regex, CFG, TM radio options -->
         </DropdownMenu.RadioGroup>
       </DropdownMenu.Content>
     </DropdownMenu>
     
     <!-- View Menu -->
     <DropdownMenu>
       <DropdownMenu.Trigger>View</DropdownMenu.Trigger>
       <DropdownMenu.Content>
         <!-- Theme submenu, Table/Graph View options -->
       </DropdownMenu.Content>
     </DropdownMenu>
     
     <!-- Help Menu -->
     <DropdownMenu>
       <DropdownMenu.Trigger>Help</DropdownMenu.Trigger>
       <DropdownMenu.Content>
         <!-- Help link -->
       </DropdownMenu.Content>
     </DropdownMenu>
   </div>
   ```

2. **Title Element**
   ```html
   <div [titleStyle]>
     Automaton<br/>
     Simulator
   </div>
   ```

3. **Input Controls** (flexible container)
   - **Input String Field**: Text input for testing strings
     ```html
     <input id="input" type="text" placeholder="type input string here" size="37" />
     ```
   
   - **Step Controls** (for DFA/NFA/TM only):
     ```html
     <span>
       <button title="go to beginning">|&lt;&lt;</button>
       <button title="backward one step">&lt; (,)</button>
       <button title="forward one step">&gt; (.)</button>
       <button title="go to end">&gt;&gt;|</button>
     </span>
     ```
   
   - **Run Settings**:
     ```html
     <label>
       Run immediately? <input type="checkbox" />
     </label>
     ```
     - If not immediate: `<button>Run</button>`
     - Step counter (for TM): `<span>step: [number]</span>`

## Menu Bar Structure

### **File Menu**
- **Load Default**: Load example for current automaton type
- **Open...**: File upload for .dfa, .nfa, .regex, .cfg, .tm files
- **Save**: Download current automaton as file
- **---** (separator)
- **Minimize DFA**: Replace DFA with minimal equivalent (only shown when DFA is selected)

### **Model Menu** 
- **◉ DFA**: Radio button selection for Deterministic Finite Automaton
- **○ NFA**: Radio button selection for Non-deterministic Finite Automaton  
- **○ Regex**: Radio button selection for Regular Expression
- **○ CFG**: Radio button selection for Context-Free Grammar
- **○ TM**: Radio button selection for Turing Machine

*Exactly one model type is selected at any time using radio button behavior.*

### **View Menu**
- **Theme >**: Submenu with editor theme options
  - Light themes, dark themes, etc.
- **---** (separator)  
- **◉ Table View**: Current HTML table display (always selected)
- **○ Graph View**: Future state diagram visualization (disabled/grayed out)

### **Help Menu**
- **Help**: Opens help.html in new tab

## Bottom View (Main Content)

**Layout**: Split-pane with resizable divider

```html
<div style="display: flex; flex-direction: column; height: [calculated-height]px">
  <SplitPane>
    ├── editor (left/top pane)
    └── runResults (right/bottom pane)
  </SplitPane>
</div>
```

### Editor Pane

Uses **Ace Editor** for syntax highlighting:

```html
<div id="editor" style="height: 100%"
     data-ace-theme="[theme]"
     data-ace-mode="[automaton-type]"
     data-ace-options="{useSoftTabs: true, showPrintMargin: false, useWrapMode: true}">
  [automaton-text-content]
</div>
```

**Fallback** (if Ace unavailable):
```html
<textarea id="editor" style="width: 99%; height: 98%">
  [automaton-text-content]
</textarea>
```

### Results Pane

**Layout**: Scrollable container

```html
<div style="overflow: auto; height: [calculated-height]px">
  ├── error-message (if present)
  ├── accepted-display 
  └── result-view (type-specific)
</div>
```

#### Error Message Display
```html
<span id="error_message_containing_div">
  <pre id="error_message">[error-text]</pre>
</span>
```

#### Accepted/Rejected Display
```html
<p id="accepted_display" style="color: green">accepted</p>
<!-- OR -->
<p id="accepted_display" style="color: red">rejected</p>
```

#### Type-Specific Result Views

**Finite Automata (DFA/NFA)**:
```html
<div>
  <!-- Current input position indicator -->
  <div>
    <span class="input_processed">current position: </span>
    <span class="input_processed" id="input_processed" style="font-family: Consolas">
      [processed-input]^[remaining-input]
    </span>
  </div>
  
  <!-- Transition table -->
  <table>
    <tr id="transition_table_head">
      <th class="transition_header_entry">state</th>
      <th class="transition_header_entry" colspan="100" align="left">transitions</th>
    </tr>
    [state-rows...]
  </table>
</div>
```

Each state row:
```html
<tr id="transition-row-[state]" state="[state]">
  <td is_state_cell="true" class="[current-class] transition_entry_[accept|reject]">
    [state-name]
  </td>
  [transition-cells...]
</tr>
```

**Context-Free Grammar (CFG)**:
```html
<div>
  <div style="float: left; border: 2px solid gray; padding: 5px; margin: 5px">
    <strong>Production rules:</strong>
    <table>
      [rule-rows...]
    </table>
  </div>
  
  <div style="float: left; border: 2px solid gray; padding: 5px; margin: 5px">
    <strong>Parse tree:</strong>
    <pre id="parse_tree">[parse-tree-string]</pre>
  </div>
</div>
```

**Turing Machine (TM)**:
```html
<div>
  <div>string output: [string-output]</div>
  
  <!-- Tape visualization -->
  <table>
    [tape-rows...]
  </table>
  
  <!-- Transition table (similar to FA but with TM-specific formatting) -->
  <table>
    [tm-transition-rows...]
  </table>
</div>
```

Each tape row:
```html
<tr data-toggle="tooltip" title="TM tape [number]">
  [left-cells...] 
  <td class="tape_cell current">[current-symbol]</td>
  [right-cells...]
</tr>
```

**Regex**: 
```html
<div></div> <!-- Empty result view -->
```

## CSS Classes & Styling

### Key CSS Classes:
- `.hover-item`: Hover effects for help link
- `.input_processed`: Styling for input position display
- `.transition_header_entry`: Table header styling
- `.transition_entry_accept`: Green styling for accept states
- `.transition_entry_reject`: Red styling for reject states  
- `.transition_entry`: Default state styling
- `.current`: Highlight current states during simulation
- `.tape_cell`: TM tape cell styling
- `.tape_cell.current`: Current tape position highlighting

### Layout Styles:
- Split-pane uses flexible layout with resizable divider
- Height calculations based on window size: `(windowHeight - 100)px`
- Responsive flex layouts throughout
- Monospace font (Consolas) for input position and parse trees

## Embedded Mode

Simplified layout without split-pane:

```html
<div>
  <a href="help.html" target="_blank" style="margin-left: 5px">
    <div class="hover-item">help</div>
  </a>
  [automaton-type-selector]
  [input-controls]
  [run-results]
</div>
```

## Key Behaviors

1. **Real-time Updates**: Editor changes trigger immediate parsing and execution (if "Run immediately" is checked)
2. **Step-by-step Simulation**: Navigation controls allow stepping through computation
3. **State Highlighting**: Current states highlighted in transition tables
4. **File I/O**: Save/load automata definitions as text files
5. **Theme Support**: Multiple editor themes available
6. **Responsive Layout**: Split-pane adjusts to window size
7. **Error Display**: Parse errors shown prominently with formatting
8. **Tooltips**: Extensive tooltip support for user guidance

## Dependencies

- **Kobalte**: Accessible SolidJS menu components (DropdownMenu)
- **Code Editor**: YAML syntax highlighting (CodeMirror/Monaco/Ace)
- **Split Pane Component**: Resizable panes for editor/results
- **File API**: Save/load functionality
- **CSS Tooltips**: Bootstrap-style tooltip system

---

## TypeScript/SolidJS Implementation Plans

This section outlines our plans for porting the Elm interface to modern TypeScript frameworks.

### Framework Selection

We will implement this interface using **SolidJS** initially, with plans to also create a **Svelte** version for comparison. The goal is to evaluate which framework provides:
- Easier/more elegant implementation
- More natural Elm Architecture patterns
- Better performance characteristics
- Superior developer experience

### Key Implementation Differences

**Menu System**: We'll use **Kobalte's DropdownMenu** components to create a clean menu bar interface (File, Model, View, Help) instead of scattered buttons throughout the interface. This provides:
- Accessible keyboard navigation and screen reader support
- Professional, familiar menu bar UX
- Organized grouping of related functions
- Clean, uncluttered interface

**Code Editor**: We'll use whichever JavaScript code editor is most straightforward to integrate (CodeMirror, Monaco, or Ace), rather than being tied to the Elm-specific Ace package. The editor should support:
- YAML syntax highlighting (since we use YAML instead of custom formats)
- Theme switching via the View → Theme menu
- Real-time change detection
- Focus/blur event handling

**CSS Approach**: The existing CSS is functional but potentially hacky due to limited CSS expertise in the original implementation. We're open to:
- Modern CSS Grid/Flexbox patterns
- CSS-in-JS solutions if appropriate for the framework
- Component-scoped styling
- More robust responsive design patterns

**Modular Automaton Display**: The automaton result view components should be designed modularly to support future visualization options:

```
AutomatonView Component Interface:
├── TableView (current HTML table display)
├── GraphView (future: state diagram with graphviz/D3/etc.)
└── [Other future visualization modes]
```

Each view component should accept:
- Automaton instance (DFA/NFA/TM/CFG/Regex)
- Current computation state/configuration
- User interaction callbacks (for stepping, highlighting, etc.)

This modularity will allow swapping between:
- **Table View**: Current HTML table format showing transition functions
- **Graph View**: Visual state diagrams with nodes and directed edges
- **Hybrid Views**: Combination displays or other visualization modes

### Future Visualization Plans

While we'll start with the existing HTML table displays, the architecture should support adding **graphical state diagrams** for DFA/NFA/TM, featuring:
- **Nodes**: States (with accept/reject/current highlighting)
- **Edges**: Transitions (labeled with input symbols/outputs)
- **Interactive Features**: Click to step, hover for details
- **Layout Algorithms**: Automatic graph positioning
- **Animations**: Smooth transitions during step-by-step execution

Potential libraries for graph visualization:
- **Graphviz** (DOT language) via WASM or server-side rendering
- **D3.js** for custom interactive diagrams
- **Cytoscape.js** for graph layout and interaction
- **Vis.js** for network visualization
- **Sigma.js** for performance-oriented graph rendering

### Architecture Goals

The implementation should maintain the **Elm Architecture** pattern (Model-View-Update) while leveraging each framework's strengths:
- **Reactive state management** with signals/stores
- **Component modularity** for easy view swapping
- **Type safety** throughout the TypeScript codebase
- **Reusable logic layer** that works with both SolidJS and Svelte versions

This design will allow us to evaluate framework trade-offs while building a more flexible and visually rich automaton simulator.

---

## Details of The Elm Architecture using SolidJS

This section defines the exact architectural patterns we will follow for implementing the Elm Architecture in our SolidJS automaton simulator.

### Core Architecture Pattern: Mixed Update Approach

We implement a **mixed approach** that combines the predictability of Elm Architecture with the pragmatism of direct updates for simple cases:

#### 1. **Global Store with Fine-Grained Reactivity**

```typescript
// Global app state using SolidJS createStore
const [appState, setAppState] = createStore<AppState>(initialState)

// Type-safe, compile-time validated paths
setAppState('design', 'strands', 50, 'domains', 2, 'name', 'newName')
setAppState('user', 'preferences', 'theme', 'dark')
setAppState('counter', prev => prev + 1)
```

**Key Benefits:**
- ✅ **Compile-time path validation** - TypeScript catches typos immediately
- ✅ **IntelliSense autocomplete** - VSCode suggests valid property paths  
- ✅ **Fine-grained reactivity** - Only components accessing changed paths re-render
- ✅ **Deep nesting support** - Perfect for complex nested state like `app_state.design.strands[50].domains[2]`
- ✅ **No Redux immutability problem** - Updating `strands[0]` doesn't affect components reading `strands[1]`

#### 2. **Mixed Update Strategy**

We use **two complementary approaches** depending on the complexity of the update:

**A. Direct Updates (for simple state changes):**
```typescript
// For trivial updates with no business logic
export const directUpdates = {
  setTheme: (theme: string) => setAppState('theme', theme),
  setInputString: (input: string) => setAppState('inputString', input),  
  setEditorContent: (content: string) => setAppState('editorContent', content),
  setRunImmediately: (runImmediately: boolean) => setAppState('runImmediately', runImmediately),
  setAutomatonType: (type: AutomatonType) => setAppState('automatonType', type),
  setSplitPercentage: (percentage: number) => setAppState('splitPercentage', percentage),
}

// Usage in components - zero boilerplate
<input 
  value={appState.inputString}
  onInput={e => directUpdates.setInputString(e.currentTarget.value)}
/>
```

**B. Message-Based Updates (for complex business logic):**
```typescript
// For updates requiring validation, side effects, or multiple state changes
export const dispatch = (message: AppMessage): void => {
  if (message instanceof LoadDefault) {
    // Complex: updates multiple fields, loads data, handles errors
    setAppState('editorContent', getDefaultYamlFor(appState.automatonType))
    setAppState('inputString', getDefaultTestFor(appState.automatonType))
    setAppState('parseError', null)
    setAppState('result', null)
  } else if (message instanceof SaveFile) {
    // Complex: validation, formatting, file download
    if (!appState.editorContent.trim()) {
      setAppState('parseError', 'Cannot save empty automaton')
      return
    }
    // ... file save logic
  } else if (message instanceof RunTest) {
    // Complex: triggers computation in visualization components
    setAppState('result', { accepts: false, outputString: null, error: null })
  }
}

// Usage in components - for complex actions
<button onClick={() => dispatch(new LoadDefault())}>
  Load Default
</button>
```

#### 3. **Decision Matrix for Update Strategy**

| Update Type | Use Direct Updates | Use Messages |
|-------------|-------------------|--------------|
| **Toggle boolean** | ✅ `directUpdates.setRunImmediately()` | ❌ Overkill |
| **Set simple value** | ✅ `directUpdates.setTheme('dark')` | ❌ Overkill |
| **Form input change** | ✅ `directUpdates.setInputString(value)` | ❌ Overkill |
| **Editor content change** | ✅ `directUpdates.setEditorContent()` | ❌ Overkill |
| **Automaton type change** | ✅ `directUpdates.setAutomatonType()` | ❌ Overkill |
| **Load/Save files** | ❌ Too complex | ✅ `dispatch(new LoadDefault())` |
| **Run algorithms** | ❌ Too complex | ✅ `dispatch(new MinimizeDfa())` |
| **Trigger computations** | ❌ Cross-component coordination | ✅ `dispatch(new RunTest())` |
| **Multiple state updates** | ❌ Logic belongs in store | ✅ Messages |
| **Validation required** | ❌ Logic belongs in store | ✅ Messages |
| **Side effects** | ❌ Logic belongs in store | ✅ Messages |

### Type-Safe Message System (DRY Principle)

We use **class-based messages** to achieve the DRY principle and eliminate boilerplate:

```typescript
// Base interface for all messages (no boilerplate)
export interface AppMessage {}

// Each message type defined ONCE as a class
export class LoadDefault implements AppMessage {}

export class SaveFile implements AppMessage {}

export class SetAutomatonType implements AppMessage {
  constructor(public readonly automatonType: AutomatonType) {}
}

export class RunTest implements AppMessage {}

// Usage in dispatch function with instanceof checks
export const dispatch = (message: AppMessage): void => {
  if (message instanceof LoadDefault) {
    // TypeScript knows this is LoadDefault type
    loadDefaultAutomaton(appState.automatonType)
  } else if (message instanceof SetAutomatonType) {
    // TypeScript knows message.automatonType exists
    setAppState('automatonType', message.automatonType)
  } else if (message instanceof SaveFile) {
    // Handle file saving logic
  } else if (message instanceof RunTest) {
    // Trigger computation
    setAppState('result', { accepts: false, outputString: null, error: null })
  }
}
```

**Key Advantages:**
- ✅ **Zero Boilerplate** - No messageType fields, no union type maintenance, no factory functions
- ✅ **Full compile-time type checking** - TypeScript validates all message types and payloads  
- ✅ **Constructor parameter shorthand** - `constructor(public readonly automatonType: AutomatonType)` 
- ✅ **IntelliSense support** - Autocomplete for message properties
- ✅ **instanceof checks** - Clean, readable dispatch logic
- ✅ **Erasable syntax compatible** - Works with strict TypeScript settings
- ✅ **No super() calls needed** - Base interface has no constructor

### Component Architecture

**Pure View Components** that access global state directly without prop-drilling:

```typescript
export const AutomatonEditor: Component = () => {
  // Direct global state access - no prop drilling needed
  const currentType = appState.automatonType
  const editorContent = appState.editorInput
  
  return (
    <div>
      <h3>Editor ({currentType.toUpperCase()})</h3>
      <textarea 
        value={editorContent}
        onInput={e => directUpdates.setEditorInput(e.currentTarget.value)}
      />
      <button onClick={() => dispatch({ type: MessageType.LoadDefault })}>
        Load Default
      </button>
    </div>
  )
}
```

**Key Principles:**
- ✅ **View components are pure functions** of global state (for rendering)
- ✅ **Event handlers can have side effects** (calling dispatch or directUpdates)
- ✅ **No prop drilling** - components access exactly what they need from global state
- ✅ **Fine-grained reactivity** - components only re-render when their accessed properties change

### Performance Characteristics

SolidJS provides **optimal performance** through:

1. **Fine-grained DOM updates** - Only specific text nodes update, no component re-execution
2. **Path-based subscriptions** - `appState.design.strands[0].name` only triggers when that exact property changes
3. **No virtual DOM overhead** - Direct DOM mutations for maximum efficiency
4. **Surgical array updates** - Changing `strands[0]` doesn't affect components reading `strands[1]`

**Example: No Component Re-execution**
```typescript
// This component function never re-executes
const StrandName: Component<{index: number}> = (props) => {
  return <div>{appState.design.strands[props.index].name}</div>
  // SolidJS directly updates the text node when name changes
  // No component function re-execution, no virtual DOM diffing
}
```

### Implementation Guidelines

**1. State Structure:**
- Design state for direct property access patterns
- Use nested objects and arrays freely - SolidJS handles deep nesting perfectly
- Group related state logically (ui, design, editor, simulator, etc.)

**2. Update Patterns:**
- Use direct updates for simple, obvious state changes
- Use messages for business logic, validation, or multi-step operations
- Keep message handlers pure (no side effects beyond state updates)

**3. Component Design:**
- Components should access global state directly where needed
- No need to pass state through props unless for reusability
- Event handlers can call either direct updates or dispatch messages
- Maintain the principle: pure rendering, side-effect event handling

**4. Type Safety:**
- Leverage TypeScript's path validation for all store updates
- Use discriminated unions for type-safe message handling
- Define clear interfaces for all state shapes
- Use literal types for constrained values (themes, automaton types, etc.)

This architecture provides the **predictability and debuggability of Elm Architecture** combined with the **performance and pragmatism of modern reactive frameworks**, specifically optimized for SolidJS's fine-grained reactivity system.