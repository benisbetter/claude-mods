import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

// Drawing the bar reads Claude Code's own numbers and calls no model;
// only a press of Master prompt does.

const lastRequestAt = atom({ plugin: 'prompt-bar', key: 'lastRequestAt' } as const, null)
const isRewriting = atom({ plugin: 'prompt-bar', key: 'isRewriting' } as const, false)

const CACHE_TTL_MS = 60 * 60 * 1000

const REWRITE_SYSTEM = `You rewrite a draft prompt for Claude Code into a stronger, more ambitious version.
Keep the author's intent, facts, file names and constraints exactly. Make the goal explicit, state what done looks like,
name how to verify it, and ask for the fuller version of the work where the draft is timid. Same language as the draft.
Never answer or carry out the prompt. Reply with the rewritten prompt only: no preamble, quotes or commentary.`

export const ring = (pct: number | undefined) => {
  if (pct === undefined) return '○'
  if (pct < 12.5) return '○'
  if (pct < 37.5) return '◔'
  if (pct < 62.5) return '◑'
  if (pct < 87.5) return '◕'
  return '●'
}

export const tone = (pct: number | undefined) =>
  pct === undefined ? 'inactive' : pct >= 80 ? 'error' : pct >= 50 ? 'warning' : 'success'

export const cacheLabel = (at: number | null, now: number) => {
  if (at === null) return { warm: false, text: 'cache cold' }
  const left = Math.ceil((at + CACHE_TTL_MS - now) / 60000)
  return left > 0 ? { warm: true, text: `cache warm ${left}m` } : { warm: false, text: 'cache cold' }
}

const PREFIX = '++'
export const draftOf = (text: string) =>
  text.trimStart().startsWith(PREFIX) ? text.trimStart().slice(PREFIX.length).trim() : undefined

async function rewrite($: EngineInterface, draft: string) {
  const r = await $.model.complete({
    model: await $.session.model(),
    system: REWRITE_SYSTEM,
    prompt: `Draft:

${draft}`,
    maxTokens: 4000,
  })
  return r.isAnswered ? r.text.trim() : undefined
}

async function masterPrompt($: EngineInterface) {
  if (await read($, isRewriting)) return
  const { text } = await $.prompt.read()
  if (!text.trim()) {
    // Desktop app: the box can't be read, so point to the ++ route.
    $.ui.toast('Master prompt: start your message with ++ and send it')
    return
  }
  await update($, isRewriting, () => true)
  try {
    const r = await $.model.complete({
      model: await $.session.model(),
      system: REWRITE_SYSTEM,
      prompt: `Draft:\n\n${text}`,
      maxTokens: 4000,
    })
    if (!r.isAnswered) {
      $.ui.toast(`Master prompt failed: ${r.reason}`)
      return
    }
    const filled = await $.prompt.fill({ text: r.text.trim(), mode: 'replace' })
    if (!filled.isFilled) $.ui.toast('Master prompt: could not put the rewrite in the box')
  } finally {
    await update($, isRewriting, () => false)
  }
}


export const register: Register = on => {
  // ++ draft -> rewritten prompt is sent instead. Works in the desktop app.
  on('prompt.submit', async ($, e, next) => {
    const draft = e.command || e.isMeta ? undefined : draftOf(e.text)
    if (draft === undefined) return next(e)
    if (!draft) {
      $.ui.toast('Master prompt: type a draft after ++')
      return { drop: 'empty draft' }
    }
    await update($, isRewriting, () => true)
    try {
      const better = await rewrite($, draft).catch(() => undefined)
      if (!better) $.ui.toast('Master prompt: rewrite failed, sent draft as typed')
      return next({ ...e, text: better ?? draft })
    } finally {
      await update($, isRewriting, () => false)
    }
  })

  on('session.start', ($, e, next) => {
    // ponytail: one-minute redraw keeps the cache countdown honest; no model calls
    $.clock.every(60_000, () => $.ui.invalidate('ui.render'))
    return next(e)
  })

  // Main thread's requests only: cache lifetime counts from when each was sent.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const at = await $.clock.now()
      await update($, lastRequestAt, () => at)
    }
    return yield* next(e)
  })

  on('turn.complete', ($, e, next) => {
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const [{ context, rateLimits }, at, now, busy] = await Promise.all([
      $.session.usage(),
      read($, lastRequestAt),
      $.clock.now(),
      read($, isRewriting),
    ])
    const limit = (kind: string) => rateLimits.find(l => l.kind === kind)?.percentUsed
    const rings: [string, number | undefined][] = [
      ['ctx', context.percent],
      ['5h', limit('five_hour')],
      ['7d', limit('seven_day')],
    ]
    const cache = cacheLabel(at, now)

    return (
      <Box flexDirection="row" gap={2}>
        {rings.map(([name, pct]) => (
          <Text key={name} color={tone(pct)}>
            {ring(pct)} {name} {pct === undefined ? '–' : `${Math.round(pct)}%`}
          </Text>
        ))}
        <Text key="cache" color={cache.warm ? 'warning' : 'inactive'}>
          {cache.warm ? '♨' : '❄'} {cache.text}
        </Text>
        <Button
          key="master"
          label={busy ? 'Rewriting…' : 'Master prompt'}
          variant="primary"
          onPress={() => masterPrompt($)}
        />
      </Box>
    )
  })
}
