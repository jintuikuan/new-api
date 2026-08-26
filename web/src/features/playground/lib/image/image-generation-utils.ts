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
import type { ModelOption } from '../../types'

const IMAGE_MODEL_PATTERN = /^(chatgpt-image|dall-e|gpt-image)/i

export function resolveImageGenerationModel(
  currentModel: string,
  models: ModelOption[]
): string {
  if (IMAGE_MODEL_PATTERN.test(currentModel)) {
    return currentModel
  }

  const availableImageModels = models.filter((model) =>
    IMAGE_MODEL_PATTERN.test(model.value)
  )
  return (
    availableImageModels.find((model) => model.value === 'gpt-image-1')
      ?.value ??
    availableImageModels[0]?.value ??
    'gpt-image-1'
  )
}
