# Architecture Alternatives for Component Communication

This document outlines alternative architectures to reduce callback complexity in the automata simulator app.

## Current Architecture Issues

The current design uses callback patterns where:
1. `App.tsx` passes `onRunReady` callback to components
2. Components call this callback in `onMount()` to export their `runComputation` function
3. `App.tsx` stores these functions and calls them when the Run button is clicked

**Problems:**
- Creates indirection and callback complexity
- Could become unwieldy in larger applications
- Makes the data flow harder to follow
- Components need to "register" themselves with parents

## Alternative 1: Message-Based Commands ⭐ (Recommended)

**Concept:** Use the existing message system instead of callbacks.

```typescript
// Add new message type
export class TriggerComputation {
  constructor(public automatonType: AutomatonType) {}
}

// In AppStore.ts dispatch
else if (message instanceof TriggerComputation) {
  if (appState.automaton && message.automatonType === appState.automatonType) {
    const computation = runUnifiedComputation(
      appState.automaton, 
      appState.automatonType, 
      appState.inputString
    )
    setAppState('computation', computation)
  }
}

// In App.tsx - Run button becomes simple
<button onClick={() => dispatch(new TriggerComputation(appState.automatonType))}>
  Run
</button>

// Components remove onRunReady entirely
// They just react to appState.computation changes via createEffect
```

**Pros:**
- ✅ No callbacks at all
- ✅ Centralized computation logic  
- ✅ Components are purely reactive
- ✅ Scales well to larger apps
- ✅ Uses existing patterns (message system)
- ✅ Easy to debug and trace

**Cons:**
- ❓ Need to handle component-specific state updates (parseTree, statesVisited)
- ❓ Slightly more message types to maintain

**Component-Specific State Options:**
- **Option A**: Move to global state (simple but larger state)
- **Option B**: Keep local, update via effects watching `appState.computation`

## Alternative 2: Reactive Component-Specific Effects

**Concept:** Move component-specific logic into centralized reactive effects.

```typescript
// In AppStore.ts - centralized component-specific effects
createEffect(() => {
  if (appState.computation && appState.automatonType === AutomatonType.Cfg) {
    const parseTree = computeParseTree(appState.automaton, appState.inputString)
    setAppState('cfgParseTree', parseTree)
  }
})

createEffect(() => {
  if (appState.computation && appState.automatonType === AutomatonType.Dfa) {
    const statesVisited = computeStatesVisited(appState.automaton, appState.inputString)
    setAppState('dfaStatesVisited', statesVisited)
  }
})

// Components become pure views
const CFGComponent = (props) => {
  return (
    <Show when={appState.computation?.accepts && appState.cfgParseTree}>
      <pre>{appState.cfgParseTree}</pre>
    </Show>
  )
}
```

**Pros:**
- ✅ No callbacks
- ✅ All logic centralized in AppStore
- ✅ Components are pure views
- ✅ Clear data flow

**Cons:**
- ❌ Global state grows larger
- ❌ Mixing UI-specific state with app state
- ❌ AppStore becomes more complex
- ❌ Less component encapsulation

## Alternative 3: Context-Based Computation

**Concept:** Create a computation context for component registration.

```typescript
// Create computation context
const ComputationContext = createContext()

const ComputationProvider = (props) => {
  const components = new Map()
  
  const registerComponent = (type, runner) => {
    components.set(type, runner)
  }
  
  const triggerComputation = () => {
    const runner = components.get(appState.automatonType)
    if (runner) runner()
  }
  
  return (
    <ComputationContext.Provider value={{ registerComponent, triggerComputation }}>
      {props.children}
    </ComputationContext.Provider>
  )
}

// Components register themselves
const CFGComponent = () => {
  const { registerComponent } = useContext(ComputationContext)
  
  onMount(() => {
    registerComponent(AutomatonType.Cfg, runComputation)
  })
}

// App.tsx uses context
const { triggerComputation } = useContext(ComputationContext)
<button onClick={triggerComputation}>Run</button>
```

**Pros:**
- ✅ No prop drilling
- ✅ Components self-register
- ✅ Clean separation of concerns

**Cons:**
- ❌ Still has registration complexity
- ❌ Context can be overused/abused
- ❌ Another abstraction layer
- ❌ Components need to know about context

## Alternative 4: Signal-Based Communication

**Concept:** Use a global signal to trigger computations.

```typescript
// Global computation trigger signal
const [triggerSignal, setTriggerSignal] = createSignal(0)

// Components listen to the trigger
const CFGComponent = () => {
  createEffect(() => {
    triggerSignal() // Accessing makes this reactive
    if (!appState.runImmediately) {
      runComputation()
    }
  })
}

// Run button increments the signal  
<button onClick={() => setTriggerSignal(prev => prev + 1)}>
  Run
</button>
```

**Pros:**
- ✅ Simple communication mechanism
- ✅ No callbacks
- ✅ Leverages SolidJS reactivity

**Cons:**
- ❌ All components run when any should run (wasteful)
- ❌ Global signal feels like a hack
- ❌ Hard to control which component should run
- ❌ Unnecessary computations

## Alternative 5: Enhanced AppStore with Component Registry

**Concept:** Combine message system with a lightweight component registry.

```typescript
// AppStore.ts - simple registry
const componentRunners = new Map<AutomatonType, () => void>()

export const registerRunner = (type: AutomatonType, runner: () => void) => {
  componentRunners.set(type, runner)
}

export const runCurrentAutomaton = () => {
  const runner = componentRunners.get(appState.automatonType)
  if (runner) runner()
}

// Components register on mount
const CFGComponent = () => {
  onMount(() => registerRunner(AutomatonType.Cfg, runComputation))
}

// App.tsx - simple call
<button onClick={runCurrentAutomaton}>Run</button>
```

**Pros:**
- ✅ Simple registration
- ✅ No prop drilling
- ✅ Type-safe
- ✅ Centralized but not complex

**Cons:**
- ❌ Still has registration step
- ❌ Module-level state (Map)
- ❌ Components need to import registration function

## Comparison Matrix

| Alternative | Complexity | Scalability | No Callbacks | Centralized Logic | Performance |
|-------------|------------|-------------|--------------|-------------------|-------------|
| **Current** | Medium     | Poor        | ❌           | Partial           | Good        |
| **Message-Based** ⭐ | Low | Excellent | ✅ | ✅ | Good |
| **Reactive Effects** | Medium | Good | ✅ | ✅ | Good |
| **Context-Based** | High | Good | ✅ | Partial | Good |
| **Signal-Based** | Low | Poor | ✅ | ❌ | Poor |
| **Registry** | Low | Good | ✅ | Partial | Good |

## Recommendation

**Alternative 1 (Message-Based Commands)** is recommended because:

1. **Uses existing patterns** - leverages the message system already in place
2. **Scales excellently** - messages are easy to track and debug in large apps  
3. **No callbacks** - eliminates the indirection complexity
4. **Centralized logic** - keeps computation in AppStore where it belongs
5. **Simple implementation** - requires minimal changes to current code
6. **Future-proof** - command pattern works well for complex applications

For component-specific state (parseTree, statesVisited), I recommend **Option B**: keep it local in components but update via `createEffect` that watches `appState.computation` changes. This maintains component encapsulation while eliminating callbacks.

## Implementation Priority

If implementing Alternative 1:
1. Add `TriggerComputation` message type
2. Update AppStore dispatch to handle the message
3. Remove `onRunReady` props from all components
4. Update App.tsx Run button to dispatch message
5. Test that manual mode still works correctly

This can be done incrementally without breaking existing functionality.