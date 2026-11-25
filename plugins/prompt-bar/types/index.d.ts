export type CacheStamp = number | null

declare module 'claude-code' {
  interface PluginState {
    'prompt-bar': { lastRequestAt: CacheStamp; isRewriting: boolean }
  }
}
