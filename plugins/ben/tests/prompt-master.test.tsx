import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'ben',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false },
} as const

test('the button rewrites the draft, and Undo puts it back', async ($, on) => {
  let box = 'make me a mod that fixs my prompts'
  const asked: string[] = []
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  on('prompt.fill', (_, e) => {
    box = e.text
    return { isFilled: true, text: e.text, cursor: e.text.length }
  })
  on('model.complete', (_, e) => {
    asked.push(String(e.prompt))
    return { value: { isAnswered: true, text: 'Make me a mod that fixes my prompts.', usage: { input_tokens: 1, output_tokens: 1 } } } as never
  })

  const ui = await $.ui.mount(BAND as never)
  await ui.press({ key: 'pm-run' })
  expect(asked[0]).toContain('fixs my prompts')
  expect(box).toBe('Make me a mod that fixes my prompts.')

  await ui.press({ key: 'pm-undo' })
  expect(box).toBe('make me a mod that fixs my prompts')
  await ui.unmount()
})
