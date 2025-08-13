
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
  readonly computation: {
    accepts: boolean
    outputString?: string
    error?: string
    navigation?: {
      currentStep: number
      totalSteps: number
      executionData?: import('./AppState').ExecutionData
    }
  }
  constructor(computation: { 
    accepts: boolean; 
    outputString?: string; 
    error?: string;
    navigation?: {
      currentStep: number
      totalSteps: number
      executionData?: import('./AppState').ExecutionData
    }
  }) {
    this.computation = computation
  }
}

export class SetParseError implements AppMessage {
  readonly error: string
  constructor(error: string) {
    this.error = error
  }
}

// Navigation messages
export class NavigateForward implements AppMessage {}
export class NavigateBackward implements AppMessage {}
export class NavigateToBeginning implements AppMessage {}
export class NavigateToEnd implements AppMessage {}
