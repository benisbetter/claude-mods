import { expect, test } from 'claude-code/testing'

import { cacheLabel, ring, tone } from '../hooks/register'

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: bar shows rings and cache, Master prompt rewrites the draft`, async ($, on) => {
    on('session.usage', () => ({ value: {
      startedAt: 0,
      context: { window: 200000, tokens: 50000, percent: 25 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 62 },
        { kind: 'seven_day', percentUsed: 91 },
      ],
    } }))
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('clock.now', () => ({ value: 0 }))
    on('prompt.read', () => ({ value: { text: 'fix the login bug', cursor: 17 } }))
    const calls: string[] = []
    on('model.complete', (_, e) => {
      calls.push(String(e.prompt))
      return { value: { isAnswered: true, text: '  Find and fix the root cause of the login bug.  ', usage: { input_tokens: 1, output_tokens: 1 } } } as never
    })
    const filled: string[] = []
    on('prompt.fill', (_, e) => {
      filled.push(e.text)
      return { isFilled: true, text: e.text, cursor: e.text.length }
    })

    const ui = await $.ui.mount({
      plugin: 'prompt-bar',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10 } as never,
    })
    expect(await ui.find({ key: 'master' })).toBeDefined()
    expect(calls).toEqual([]) // drawing the bar makes no model call

    await ui.press({ key: 'master' })
    expect(calls.length).toBe(1)
    expect(calls[0]).toContain('fix the login bug')
    expect(filled).toEqual(['Find and fix the root cause of the login bug.'])
    await ui.unmount()
  })
}

test('helpers', async () => {
  expect(ring(undefined)).toBe('○')
  expect(ring(50)).toBe('◑')
  expect(ring(95)).toBe('●')
  expect(tone(85)).toBe('error')
  expect(tone(10)).toBe('success')
  expect(cacheLabel(null, 0).warm).toBe(false)
  expect(cacheLabel(0, 30 * 60000)).toEqual({ warm: true, text: 'cache warm 30m' })
  expect(cacheLabel(0, 61 * 60000).warm).toBe(false)
})
