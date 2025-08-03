import type { AutomatonType } from './AppState'

export interface AppMessage {}

export class LoadDefault implements AppMessage {}
export class SaveFile implements AppMessage {}
export class MinimizeDfa implements AppMessage {}
export class RunTest implements AppMessage {}

export class SetRunImmediately implements AppMessage {
  constructor(public readonly runImmediately: boolean) {}
}

export class SetAutomatonType implements AppMessage {
  constructor(public readonly automatonType: AutomatonType) {}
}

export class LoadFile implements AppMessage {
  constructor(public readonly content: string) {}
}

export class OpenFile implements AppMessage {}

export class SetTheme implements AppMessage {
  constructor(public readonly theme: string) {}
}

export class SetInputString implements AppMessage {
  constructor(public readonly inputString: string) {}
}

export class SetEditorContent implements AppMessage {
  constructor(public readonly editorContent: string) {}
}

export class SaveFileAs implements AppMessage {
  constructor(public readonly filename: string, public readonly content: string) {}
}
