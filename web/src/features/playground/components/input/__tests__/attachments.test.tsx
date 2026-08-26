/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlaygroundConfig } from '../../../types'
import { PlaygroundInput } from '../playground-input'

const config: PlaygroundConfig = {
  frequency_penalty: 0,
  group: 'default',
  max_tokens: 2048,
  model: 'gpt-4o',
  presence_penalty: 0,
  seed: null,
  stream: true,
  temperature: 1,
  top_p: 1,
}

describe('playground photo attachments', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo-preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  })

  it('keeps the photo preview visible and enables send after selection', async () => {
    const user = userEvent.setup()

    render(
      <PlaygroundInput
        config={config}
        groups={[{ label: 'Default', ratio: 1, value: 'default' }]}
        groupValue='default'
        models={[{ label: 'GPT-4o', value: 'gpt-4o' }]}
        modelValue='gpt-4o'
        onConfigChange={vi.fn()}
        onGroupChange={vi.fn()}
        onModelChange={vi.fn()}
        onParameterEnabledChange={vi.fn()}
        onSubmit={vi.fn()}
        parameterEnabled={{
          frequency_penalty: false,
          max_tokens: false,
          presence_penalty: false,
          seed: false,
          temperature: false,
          top_p: false,
        }}
      />
    )

    const photo = new File(['photo'], 'photo.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Upload photo'), photo)

    expect(screen.getByAltText('photo.png')).toHaveAttribute(
      'src',
      'blob:photo-preview'
    )
    for (const sendButton of screen.getAllByRole('button', {
      name: /^Send/,
    })) {
      expect(sendButton).toBeEnabled()
    }
  })

  it('keeps a high-resolution photo larger than ten megabytes ready to send', async () => {
    const user = userEvent.setup()

    render(
      <PlaygroundInput
        config={config}
        groups={[{ label: 'Default', ratio: 1, value: 'default' }]}
        groupValue='default'
        models={[{ label: 'GPT-4o', value: 'gpt-4o' }]}
        modelValue='gpt-4o'
        onConfigChange={vi.fn()}
        onGroupChange={vi.fn()}
        onModelChange={vi.fn()}
        onParameterEnabledChange={vi.fn()}
        onSubmit={vi.fn()}
        parameterEnabled={{
          frequency_penalty: false,
          max_tokens: false,
          presence_penalty: false,
          seed: false,
          temperature: false,
          top_p: false,
        }}
      />
    )

    const photo = new File(
      [new Uint8Array(12 * 1024 * 1024)],
      'high-resolution.jpg',
      { type: 'image/jpeg' }
    )
    await user.upload(screen.getByLabelText('Upload photo'), photo)

    expect(screen.getByAltText('high-resolution.jpg')).toBeVisible()
    for (const sendButton of screen.getAllByRole('button', {
      name: /^Send/,
    })) {
      expect(sendButton).toBeEnabled()
    }
  })
})
