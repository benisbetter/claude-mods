// One contract for every mod in the ben plugin. Prefix each mod's keys.
export type PmPhase = 'idle' | 'working' | 'error'

declare module 'claude-code' {
  interface PluginState {
    ben: {
      // prompt-master
      pmPhase: PmPhase
      pmOriginal: string | null
      pmNote: string | null
    }
  }
}
