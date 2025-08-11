
// Base interface for type checking
export abstract class AppMessage {}


export class LoadDefault implements AppMessage {}
export class SaveFile implements AppMessage {}
export class MinimizeDfa implements AppMessage {}
export class RunTest implements AppMessage {}


export class LoadFile implements AppMessage {
  readonly content: string
  constructor(content: string) {
    this.content = content
  }
}

export class OpenFile implements AppMessage {}

export class SaveFileAs implements AppMessage {
  readonly filename: string
  readonly content: string
  constructor(filename: string, content: string) {
    this.filename = filename
    this.content = content
  }
}

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
  readonly error: string
  constructor(error: string) {
    this.error = error
  }
}
