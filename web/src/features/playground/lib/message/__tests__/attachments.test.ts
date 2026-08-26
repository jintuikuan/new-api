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
import { describe, expect, it } from 'vitest'

import type { PlaygroundAttachment } from '../../../types'
import {
  createUserMessage,
  formatMessageForAPI,
  isValidMessage,
} from '../message-utils'

const image: PlaygroundAttachment = {
  dataUrl: 'data:image/png;base64,aW1hZ2U=',
  filename: 'photo.png',
  mediaType: 'image/png',
  type: 'image',
}

const file: PlaygroundAttachment = {
  dataUrl: 'data:application/pdf;base64,cGRm',
  filename: 'report.pdf',
  mediaType: 'application/pdf',
  type: 'file',
}

describe('playground message attachments', () => {
  it('formats photos and files as OpenAI-compatible content parts', () => {
    const message = createUserMessage('Review these', [image, file])

    expect(formatMessageForAPI(message)).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: 'Review these' },
        { type: 'image_url', image_url: { url: image.dataUrl } },
        {
          type: 'file',
          file: { filename: 'report.pdf', file_data: file.dataUrl },
        },
      ],
    })
  })

  it('allows an attachment-only user message', () => {
    expect(isValidMessage(createUserMessage('', [image]))).toBe(true)
  })
})
