# Component Architecture Refactoring Plan

## Goal
Improve the app structure by centralizing error handling and simplifying component logic.

## Current Issues
- Each automaton component (DFATableComponent, NFATableComponent, TMComponent, etc.) duplicates the same error handling logic
- Components need to constantly check if their automaton is null and handle parsing errors
- Error display code is repeated in every component

## Desired End State
```
App.tsx handles all error display:
├── Show error message (centralized, one place)
└── If no error, pass non-nullable automaton to component
    ├── DFAComponent receives `dfa: DFA` prop (guaranteed non-null)
    ├── NFAComponent receives `nfa: NFA` prop (guaranteed non-null)
    ├── TMComponent receives `tm: TM` prop (guaranteed non-null)
    └── etc.
```

## Incremental Plan

### Phase 1: Move Error Handling to App.tsx
1. **Test current state thoroughly** - ensure model switching, parsing, etc. all work
2. **Update App.tsx only** - add centralized error display, keep all existing components unchanged
3. **Update ONE component at a time** - start with DFATableComponent
   - Add non-nullable prop: `dfa: DFA`
   - Remove error handling JSX (the `<Show when={error}>` blocks)
   - Remove null checks (since prop is guaranteed non-null)
   - Test thoroughly before proceeding
4. **Repeat for each component** - NFATableComponent, TMComponent, etc.

### Phase 2: Clean Up Getter Functions (Optional)
- Remove simple wrapper functions like `const dfa = () => props.dfa`
- Inline direct property access: use `props.dfa.states` instead of `dfa().states`
- Only if it improves clarity and doesn't break reactivity

## Safety Rules
- ✅ **ONE component at a time** - never change multiple components simultaneously
- ✅ **Test after each change** - verify model switching, parsing errors, computation all work
- ✅ **Keep original functionality** - don't change how components look or behave
- ✅ **Preserve all existing features** - substitution tables, navigation controls, styling, etc.
- ⚠️ **Stop immediately if anything breaks** - revert and analyze before proceeding

## What NOT to Change
- Component display logic (tables, styling, formatting)
- Navigation controls functionality  
- Parsing logic or computation logic
- Any component-specific features (like regex substitution tables)
- File names or component names

## Success Criteria
- All existing functionality preserved
- Model switching works correctly
- Parse errors display properly when switching between incompatible formats
- Code is cleaner with centralized error handling
- No duplication of error display logic