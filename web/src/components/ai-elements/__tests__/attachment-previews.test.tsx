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

import { PromptInput, usePromptInputAttachments } from '../prompt-input'

function AttachmentHarness() {
  const attachments = usePromptInputAttachments()

  return (
    <>
      <button
        onClick={() =>
          attachments.add([
            new File(['photo'], `photo-${attachments.files.length}.png`, {
              type: 'image/png',
            }),
          ])
        }
        type='button'
      >
        Add photo
      </button>
      <output aria-label='Attachment count'>{attachments.files.length}</output>
    </>
  )
}

describe('prompt input attachment previews', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:first-photo')
      .mockReturnValueOnce('blob:second-photo')
  })

  it('keeps existing preview URLs until removal or unmount', async () => {
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const user = userEvent.setup()
    const view = render(
      <PromptInput onSubmit={vi.fn()}>
        <AttachmentHarness />
      </PromptInput>
    )

    await user.click(screen.getByRole('button', { name: 'Add photo' }))
    await user.click(screen.getByRole('button', { name: 'Add photo' }))

    expect(screen.getByLabelText('Attachment count')).toHaveTextContent('2')
    expect(revokeObjectURL).not.toHaveBeenCalled()

    view.unmount()

    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first-photo')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:second-photo')
  })
})
