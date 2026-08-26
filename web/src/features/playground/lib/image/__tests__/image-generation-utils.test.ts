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

import { resolveImageGenerationModel } from '../image-generation-utils'

describe('image generation model selection', () => {
  it('keeps the selected image model', () => {
    expect(resolveImageGenerationModel('gpt-image-1.5', [])).toBe(
      'gpt-image-1.5'
    )
  })

  it('prefers an available GPT Image model for a text model selection', () => {
    expect(
      resolveImageGenerationModel('gpt-4o', [
        { label: 'DALL-E 3', value: 'dall-e-3' },
        { label: 'GPT Image', value: 'gpt-image-1' },
      ])
    ).toBe('gpt-image-1')
  })
})
