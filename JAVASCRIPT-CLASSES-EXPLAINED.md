# JavaScript Classes vs Factory Functions - Detailed Explanation

## The Key Insight: Classes Generate Extra Runtime Code

When you write a class in JavaScript/TypeScript, it doesn't just create objects - it creates a whole infrastructure for creating objects. Let me show you what I mean:

### What Happens with Classes

When you write this TypeScript class:

```typescript
class LoadDefault {
  readonly messageType = 'LoadDefault'
  
  constructor() {
    // Constructor code
  }
  
  someMethod() {
    console.log('Hello')
  }
}
```

It compiles to this JavaScript (simplified):

```javascript
// This is what actually runs in the browser!
var LoadDefault = /** @class */ (function () {
    function LoadDefault() {
        this.messageType = 'LoadDefault';
    }
    LoadDefault.prototype.someMethod = function () {
        console.log('Hello');
    };
    return LoadDefault;
}());
```

Notice all that extra code! The class creates:
1. A constructor function
2. A prototype object
3. Methods attached to the prototype
4. The special `/** @class */` marker

### What Happens with Factory Functions

Now look at a factory function:

```typescript
// TypeScript interface - disappears completely after compilation
interface LoadDefault {
  readonly messageType: 'LoadDefault'
}

// Simple factory function
function createLoadDefault(): LoadDefault {
  return { messageType: 'LoadDefault' }
}
```

This compiles to just:

```javascript
// That's it! No extra infrastructure
function createLoadDefault() {
  return { messageType: 'LoadDefault' };
}
```

## Understanding Prototype Chains

JavaScript uses "prototypal inheritance" - when you create objects with classes, they're linked in a chain:

```javascript
class Animal {
  eat() { console.log('eating') }
}

class Dog extends Animal {
  bark() { console.log('woof') }
}

const myDog = new Dog()
```

Here's what happens in memory:

```
myDog (object)
  ↓ [[Prototype]]
Dog.prototype (has bark method)
  ↓ [[Prototype]]
Animal.prototype (has eat method)
  ↓ [[Prototype]]
Object.prototype (has toString, etc.)
  ↓ [[Prototype]]
null
```

When you call `myDog.eat()`, JavaScript has to:
1. Look for `eat` on `myDog` - not found
2. Look for `eat` on `Dog.prototype` - not found
3. Look for `eat` on `Animal.prototype` - found!

This lookup process has performance overhead.

### Factory Functions Have No Prototype Chain

With factory functions:

```javascript
function createDog() {
  return {
    eat() { console.log('eating') },
    bark() { console.log('woof') }
  }
}

const myDog = createDog()
```

The object structure is flat:

```
myDog (object with eat and bark directly on it)
  ↓ [[Prototype]]
Object.prototype
  ↓ [[Prototype]]
null
```

No inheritance chain to traverse!

## Understanding "this" Binding

In JavaScript, `this` is a special keyword that changes meaning based on how a function is called. With classes, this can be confusing:

### The "this" Problem with Classes

```javascript
class Button {
  constructor() {
    this.count = 0
  }
  
  handleClick() {
    this.count++ // "this" might not be what you expect!
    console.log(this.count)
  }
}

const button = new Button()

// This works:
button.handleClick() // logs: 1

// But this breaks:
const clickHandler = button.handleClick
clickHandler() // Error! "this" is undefined

// Common in event handlers:
element.addEventListener('click', button.handleClick) // Broken!
```

You need to "bind" the method:

```javascript
// Fix 1: Bind in constructor
constructor() {
  this.count = 0
  this.handleClick = this.handleClick.bind(this)
}

// Fix 2: Arrow function property
handleClick = () => {
  this.count++
}
```

### Factory Functions Don't Have "this" Problems

```javascript
function createButton() {
  let count = 0  // Just a regular variable
  
  return {
    handleClick() {
      count++  // No "this" needed!
      console.log(count)
    }
  }
}

const button = createButton()

// Always works:
button.handleClick() // logs: 1

const clickHandler = button.handleClick
clickHandler() // logs: 2 - still works!

element.addEventListener('click', button.handleClick) // Works perfectly!
```

## Why erasableSyntaxOnly Cares

The `erasableSyntaxOnly` setting wants to ensure that your TypeScript types don't affect the JavaScript output. 

### Classes Mix Types and Runtime

```typescript
// This is BOTH a type AND a runtime constructor
class LoadDefault {
  messageType = 'LoadDefault'
}

// You can use it as a type:
let msg: LoadDefault

// AND as a value:
const instance = new LoadDefault()
```

This dual nature violates `erasableSyntaxOnly` - the class can't be "erased" because it's needed at runtime.

### Interfaces + Factories Separate Concerns

```typescript
// This is ONLY a type - completely erased
interface LoadDefault {
  messageType: 'LoadDefault'
}

// This is ONLY a runtime value - no type info
const createLoadDefault = () => ({ messageType: 'LoadDefault' as const })

// Clear separation:
let msg: LoadDefault              // Using as type
const instance = createLoadDefault() // Using factory function
```

## Functional Programming Style

Classes encourage object-oriented programming (OOP) with mutation and methods:

```javascript
// OOP style with classes
class Counter {
  constructor() {
    this.value = 0
  }
  
  increment() {
    this.value++ // Mutation!
  }
  
  getValue() {
    return this.value
  }
}

const counter = new Counter()
counter.increment() // Mutates the object
```

Factory functions encourage functional programming (FP) with immutability:

```javascript
// FP style with factory functions
function createCounter(value = 0) {
  return {
    value,
    increment: () => createCounter(value + 1), // Returns new counter
    getValue: () => value
  }
}

const counter1 = createCounter()
const counter2 = counter1.increment() // New object, no mutation
```

## Real Example: Our Message System

Here's why we chose factory functions for our messages:

```typescript
// ❌ With classes (problematic)
class SetTheme {
  constructor(public theme: string) {}
  
  // Methods? We don't need any
  // Inheritance? We don't want any
  // this binding? Just causes problems
  // Prototype chain? Unnecessary overhead
}

// ✅ With factory functions (clean)
interface SetTheme {
  messageType: 'SetTheme'
  theme: string
}

const createSetTheme = (theme: string): SetTheme => ({
  messageType: 'SetTheme',
  theme
})
```

The factory function approach:
- Creates simple objects with no baggage
- No prototype chain overhead
- No "this" confusion
- Clearly separates types from runtime
- More functional, less object-oriented
- Smaller JavaScript output

## Summary

Think of it this way:
- **Classes** are like factories that come with a whole assembly line, management structure, and company policies
- **Factory functions** are like a simple machine that stamps out objects - no bureaucracy, just results

For our message system, we just need simple data objects. Classes would add unnecessary complexity and runtime overhead for no benefit. Factory functions give us exactly what we need - nothing more, nothing less!