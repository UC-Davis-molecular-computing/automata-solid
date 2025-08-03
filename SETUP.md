# TypeScript Automata Simulator - Setup Guide

This guide explains how to set up the TypeScript automata simulator project using Vite + SolidJS.

## Prerequisites

- **Node.js** (version 18+ recommended) - Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- A code editor like **VS Code** (recommended for TypeScript support)

## Project Setup (Already Complete)

This project was created using the official Vite workflow:

```bash
npm create vite@latest
# Selected "automata-ts" as project name
# Selected "Solid" as framework
# Selected "TypeScript" as variant

cd automata-ts
npm install
npm run dev
```

The development server runs at `http://localhost:5173/`

## Project Structure

```
automata-ts/
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration (app)
├── tsconfig.app.json     # TypeScript app-specific settings
├── tsconfig.node.json    # TypeScript Node.js settings
├── vite.config.ts        # Vite build configuration
├── index.html            # Main HTML entry point
├── CLAUDE.md             # Development guidance for Claude Code
├── SETUP.md             # This setup guide
├── public/              # Static assets
│   └── vite.svg
└── src/                 # TypeScript source code
    ├── index.tsx        # Application entry point (bootstraps the app)
    ├── index.css        # Global styles
    ├── vite-env.d.ts    # Vite TypeScript definitions
    ├── assets/          # Images and other assets
    │   └── solid.svg
    ├── core/            # Automata classes (DFA, NFA, TM, CFG, Regex)
    ├── parsers/         # YAML parsing and validation
    ├── types/           # Shared TypeScript types
    └── ui/              # SolidJS components and pages
        ├── App.tsx      # Main SolidJS app component
        ├── App.css      # App-specific styles
        ├── components/  # Reusable UI components
        └── pages/       # Complete screens/views
```

## Adding Dependencies for Automata Project

The basic Vite + SolidJS setup is complete. Dependencies are defined in `package.json`:

### Dependencies Added
- **Runtime**: `js-yaml` for YAML parsing
- **Development**: `vitest`, `jsdom`, `@types/node`, `@types/js-yaml` for testing and type definitions

### Install All Dependencies
```bash
npm install
```

### 3. Update package.json Scripts
Add test scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui"
  }
}
```

### 4. Create Vitest Configuration
Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
      ]
    }
  }
});
```

### 5. Update Vite Configuration
Update `vite.config.ts` to support our project structure:
```typescript
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 5173,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': '/src',
      '@core': '/src/core',
      '@parsers': '/src/parsers',
      '@ui': '/src/ui',
      '@types': '/src/types',
    }
  }
});
```

## Development Commands

### Basic Commands (Working Now)
- `npm run dev` - Start development server at http://localhost:5173/
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Additional Commands (After Dependencies Added)
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI

## Key Differences from Manual Setup

### 1. **SolidJS Framework**
- Uses SolidJS instead of vanilla TypeScript
- Reactive state management with signals
- Component-based architecture similar to React but with fine-grained reactivity

### 2. **Vite Optimizations**
- Fast HMR (Hot Module Replacement)
- TypeScript compilation in memory during development
- Optimized production builds with code splitting

### 3. **Modern TypeScript Configuration**
- `"target": "ES2022"` for modern JavaScript features
- `"moduleResolution": "bundler"` for Vite compatibility
- Strict type checking enabled

## Installation and Testing

### Verify Current Setup
```bash
# Check that basic setup works
npm run dev
# Visit http://localhost:5173/ - should show SolidJS default page

# Build production version
npm run build
```

### Current Status
✅ **Dependencies installed**: All required packages are in `package.json` and installed  
✅ **Directory structure created**: `core/`, `parsers/`, `ui/`, `types/` folders exist  
✅ **App.tsx moved to ui/**: Following organized component structure  

## Next Steps

1. **Copy example files**: Bring over automata example files for testing
2. **Implement DFA class**: Start with core automata logic
3. **Add YAML parsing**: Enable specification file processing
4. **Build SolidJS UI**: Create reactive user interface

## Reference Implementations

The project references two existing implementations:
- **Dart version** (`../automata-ts-old/automata-dart/`): Provides imperative logic patterns
- **Elm version** (`../automata-ts-old/automata-elm/`): Provides UI architecture patterns

These serve as the foundation for the TypeScript implementation combining the best of both approaches.