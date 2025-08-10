import type { AutomatonType } from './AppState'

// Base interface for type checking
export abstract class AppMessage {}


// Option 2: Classes with explicit fields (erasableSyntaxOnly compatible)
export class LoadDefault implements AppMessage {}
export class SaveFile implements AppMessage {}
export class MinimizeDfa implements AppMessage {}
export class RunTest implements AppMessage {}

export class SetRunImmediately implements AppMessage {
  readonly runImmediately: boolean
  constructor(runImmediately: boolean) {
    this.runImmediately = runImmediately
  }
}

export class SetAutomatonType implements AppMessage {
  readonly automatonType: AutomatonType
  constructor(automatonType: AutomatonType) {
    this.automatonType = automatonType
  }
}

export class LoadFile implements AppMessage {
  readonly content: string
  constructor(content: string) {
    this.content = content
  }
}

export class OpenFile implements AppMessage {}

export class SetTheme implements AppMessage {
  readonly theme: string
  constructor(theme: string) {
    this.theme = theme
  }
}

export class SetInputString implements AppMessage {
  readonly inputString: string
  constructor(inputString: string) {
    this.inputString = inputString
  }
}

export class SetEditorContent implements AppMessage {
  readonly editorContent: string
  constructor(editorContent: string) {
    this.editorContent = editorContent
  }
}

export class SaveFileAs implements AppMessage {
  readonly filename: string
  readonly content: string
  constructor(filename: string, content: string) {
    this.filename = filename
    this.content = content
  }
}

// Computation result messages
export class SetComputationResult implements AppMessage {
  readonly result: {
    accepts: boolean
    outputString?: string
    error?: string
  }
  constructor(result: { accepts: boolean; outputString?: string; error?: string }) {
    this.result = result
  }
}

export class SetParseError implements AppMessage {
  readonly error?: string
  constructor(error?: string) {
    this.error = error
  }
}
