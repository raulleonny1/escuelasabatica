declare class JitsiMeetExternalAPI {
  constructor(domain: string, options: Record<string, unknown>)
  addListener(event: string, listener: (...args: unknown[]) => void): void
  removeListener(event: string, listener: (...args: unknown[]) => void): void
  executeCommand(command: string, ...args: unknown[]): void
  dispose(): void
}

interface Window {
  JitsiMeetExternalAPI: typeof JitsiMeetExternalAPI
}
