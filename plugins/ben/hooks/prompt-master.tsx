import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PmPhase as Phase } from '../types'

const phase = atom({ plugin: 'ben', key: 'pmPhase' } as const, 'idle' as Phase)
const original = atom({ plugin: 'ben', key: 'pmOriginal' } as const, null as string | null)
const note = atom({ plugin: 'ben', key: 'pmNote' } as const, null as string | null)

const SYSTEM = `You rewrite a user's rough draft prompt for an AI assistant into a better prompt.
Keep the user's intent, facts, names, links, file paths and any code exactly. Do not add requirements they did not imply.
Make it clear and specific: state the goal first, then the needed context, constraints, and what a good result looks like (format, length) when the draft implies them.
Fix spelling and grammar. Keep it about as short as it can be while clear. Write it in the user's voice, as a request ("Make me...", "Help me...").
Never answer or carry out the prompt. Output only the rewritten prompt text, with no preface, quotes or commentary.`

async function run($: EngineInterface) {
  if ((await read($, phase)) === 'working') return
  const { text } = await $.prompt.read()
  const draft = text.trim()
  if (!draft) {
    $.ui.toast('Prompt Master: type a draft first')
    return
  }
  await update($, phase, () => 'working')
  await update($, note, () => null)
  const r = await $.model.complete({
    model: 'sonnet',
    system: SYSTEM,
    prompt: `Rough draft:\n<draft>\n${draft}\n</draft>`,
    maxTokens: 2048,
    timeoutMs: 60000,
  })
  if (!r.isAnswered || !r.text.trim()) {
    await update($, phase, () => 'error')
    await update($, note, () => (r.isAnswered ? 'empty reply' : r.reason))
    return
  }
  const filled = await $.prompt.fill({ text: r.text.trim(), mode: 'replace' })
  if (!filled.isFilled) {
    await update($, phase, () => 'error')
    await update($, note, () => 'could not write to the prompt box')
    return
  }
  await update($, original, () => text)
  await update($, phase, () => 'idle')
  $.ui.toast('Prompt Master: draft rewritten. Review, then send.')
}

async function undo($: EngineInterface) {
  const old = await read($, original)
  if (old === null) return
  await $.prompt.fill({ text: old, mode: 'replace' })
  await update($, original, () => null)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.command.register({ name: 'prompt-master', description: 'Rewrite the draft in the prompt box into a better prompt' })
    return next(e)
  })

  on('command.run', { command: 'prompt-master' }, async ($, e) => {
    void run($)
    return { text: 'Prompt Master is rewriting your draft.' }
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, original, () => null)
    await update($, note, () => null)
    if ((await read($, phase)) === 'error') await update($, phase, () => 'idle')
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.props.isWorking) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const p = await read($, phase)
    const old = await read($, original)
    const why = await read($, note)

    return (
      <Box flexDirection="row" justifyContent="flex-end">
        {p === 'error' ? <Text dimColor>Prompt Master failed: {why ?? 'unknown'} </Text> : null}
        {old !== null && p !== 'working' ? (
          <Button key="pm-undo" label={'\u21B6'} plain dimColor onPress={() => undo($)} />
        ) : null}
        {p === 'working' ? (
          <Text dimColor>{'\u2026'}</Text>
        ) : (
          <Button key="pm-run" label={'\u2728'} plain onPress={() => run($)} />
        )}
      </Box>
    )
  })
}
