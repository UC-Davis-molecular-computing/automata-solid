# SolidJS `createEffect` - Comprehensive Guide

## What is `createEffect`?

`createEffect` is SolidJS's way of running side effects when reactive dependencies change. It's similar to `useEffect` in React, but much more precise and efficient.

## How It Works

### Basic Syntax
```typescript
import { createEffect } from 'solid-js'

createEffect(() => {
  // This function runs whenever any reactive values it accesses change
  console.log('Effect running!')
})
```

### Key Characteristics

1. **Automatic Dependency Tracking**: SolidJS automatically tracks which signals/stores the effect accesses
2. **Fine-Grained**: Only re-runs when dependencies actually change
3. **Synchronous**: Effects run immediately when dependencies change
4. **No Dependency Array**: Unlike React, you don't manually specify dependencies

## Simple Examples

### Example 1: Logging State Changes
```typescript
const [count, setCount] = createSignal(0)

createEffect(() => {
  console.log('Count changed to:', count())
  // This runs immediately, then again whenever count() changes
})

setCount(1) // Logs: "Count changed to: 1"
setCount(2) // Logs: "Count changed to: 2"
```

### Example 2: Multiple Dependencies
```typescript
const [name, setName] = createSignal('Alice')
const [age, setAge] = createSignal(25)

createEffect(() => {
  console.log(`${name()} is ${age()} years old`)
  // Runs when EITHER name OR age changes
})

setName('Bob')  // Logs: "Bob is 25 years old"
setAge(26)      // Logs: "Bob is 26 years old"
```

### Example 3: With Store
```typescript
const [state, setState] = createStore({ user: { name: 'Alice', age: 25 } })

createEffect(() => {
  console.log('User name:', state.user.name)
  // Only runs when state.user.name specifically changes
  // NOT when state.user.age changes
})

setState('user', 'age', 26)    // Does NOT trigger effect
setState('user', 'name', 'Bob') // DOES trigger effect
```

## Common Use Cases

### 1. **Side Effects (API calls, localStorage, etc.)**
```typescript
const [userId, setUserId] = createSignal(1)

createEffect(() => {
  // Fetch user data whenever userId changes
  fetch(`/api/users/${userId()}`)
    .then(res => res.json())
    .then(user => {
      // Update other state based on API response
      setUserData(user)
    })
})
```

### 2. **localStorage Synchronization**
```typescript
const [settings, setSettings] = createStore({
  theme: 'dark',
  language: 'en'
})

createEffect(() => {
  // Save to localStorage whenever settings change
  localStorage.setItem('app-settings', JSON.stringify(settings))
})
```

### 3. **DOM Manipulation**
```typescript
const [isVisible, setIsVisible] = createSignal(false)

createEffect(() => {
  if (isVisible()) {
    document.body.classList.add('modal-open')
  } else {
    document.body.classList.remove('modal-open')
  }
})
```

### 4. **Computed Side Effects**
```typescript
const [items, setItems] = createSignal([])

createEffect(() => {
  // Update document title with item count
  document.title = `Shopping Cart (${items().length} items)`
})
```

## Advanced Features

### `createEffect` with Cleanup
```typescript
createEffect(() => {
  const timer = setInterval(() => {
    console.log('Timer tick')
  }, 1000)
  
  // Return cleanup function
  return () => {
    clearInterval(timer)
  }
})
```

### Conditional Effects
```typescript
const [user, setUser] = createSignal(null)
const [posts, setPosts] = createSignal([])

createEffect(() => {
  // Only run if user exists
  if (user()) {
    fetch(`/api/users/${user().id}/posts`)
      .then(res => res.json())
      .then(setPosts)
  }
})
```

### Access Previous Value
```typescript
const [count, setCount] = createSignal(0)

createEffect((prev) => {
  console.log(`Count changed from ${prev} to ${count()}`)
  return count() // This becomes the 'prev' value next time
})
```

## Comparison with React `useEffect`

| Feature | SolidJS `createEffect` | React `useEffect` |
|---------|------------------------|-------------------|
| **Dependency tracking** | Automatic | Manual array |
| **Granularity** | Fine-grained (specific properties) | Coarse (entire objects) |
| **When it runs** | Synchronously when deps change | After render cycle |
| **Performance** | Very efficient | Can cause cascade re-renders |
| **Cleanup** | Return function from effect | Return function from effect |

```typescript
// React
useEffect(() => {
  localStorage.setItem('theme', theme)
}, [theme]) // Must manually specify dependencies

// SolidJS  
createEffect(() => {
  localStorage.setItem('theme', theme())
  // Automatically tracks theme() dependency
})
```

## Best Practices

### ✅ **DO:**
```typescript
// Access reactive values directly in the effect
createEffect(() => {
  console.log(user().name) // ✅ Good
})

// Use for side effects
createEffect(() => {
  localStorage.setItem('data', JSON.stringify(data()))
})

// Return cleanup functions when needed
createEffect(() => {
  const subscription = api.subscribe(data())
  return () => subscription.unsubscribe()
})
```

### ❌ **DON'T:**
```typescript
// Don't access reactive values outside the effect
const userName = user().name
createEffect(() => {
  console.log(userName) // ❌ Won't react to changes
})

// Don't use for pure computations (use createMemo instead)
createEffect(() => {
  const doubled = count() * 2 // ❌ Use createMemo for this
  setDoubled(doubled)
})

// Don't cause infinite loops
createEffect(() => {
  setCount(count() + 1) // ❌ Infinite loop!
})
```

## For Our localStorage Use Case

Here's how we'd use `createEffect` for localStorage persistence:

### Basic Approach
```typescript
createEffect(() => {
  const toSave = {
    automatonType: appState.automatonType,
    editorInput: appState.editorInput,
    testInput: appState.testInput,
    theme: appState.theme
  }
  
  localStorage.setItem('automata-app-state', JSON.stringify(toSave))
})
```

### With Debouncing (Recommended)
```typescript
import { debounce } from 'lodash-es'

const debouncedSave = debounce((data: any) => {
  localStorage.setItem('automata-app-state', JSON.stringify(data))
}, 300) // Wait 300ms after last change

createEffect(() => {
  const toSave = {
    automatonType: appState.automatonType,
    editorInput: appState.editorInput,
    testInput: appState.testInput,
    theme: appState.theme
  }
  
  debouncedSave(toSave)
})
```

### Fine-Grained Effects (Multiple Effects)
```typescript
// Separate effect for editor content (debounced for typing)
createEffect(() => {
  debouncedSave('editorInput', appState.editorInput)
})

// Immediate effect for settings (no debounce needed)
createEffect(() => {
  localStorage.setItem('automata-settings', JSON.stringify({
    automatonType: appState.automatonType,
    theme: appState.theme
  }))
})
```

## Why `createEffect` is Perfect for Our Use Case

1. **Automatic**: No need to remember to call save functions
2. **Efficient**: Only saves when the specific data we care about changes
3. **Fine-Grained**: Changing `parseError` won't trigger localStorage save
4. **Reactive**: Fits naturally with SolidJS's reactive system
5. **Flexible**: Easy to add debouncing, error handling, etc.

The effect will run immediately when created (saving initial state), then again whenever any of the tracked properties change. This gives us the same behavior as the Elm implementation but with SolidJS's reactive primitives.