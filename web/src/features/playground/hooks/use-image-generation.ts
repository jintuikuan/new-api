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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { sendImageGeneration } from '../api'
import { ERROR_MESSAGES } from '../constants'
import {
  appendUserMessagePair,
  completeAssistantMessage,
  parseRequestErrorDetails,
  resolveImageGenerationModel,
  updateAssistantMessageWithError,
  updateCurrentVersionContent,
  updateLastAssistantMessage,
} from '../lib'
import type { Message, ModelOption, PlaygroundConfig } from '../types'

type UseImageGenerationOptions = {
  config: PlaygroundConfig
  messages: Message[]
  models: ModelOption[]
  onMessageUpdate: (
    updater: Message[] | ((prev: Message[]) => Message[])
  ) => void
}

export function useImageGeneration(options: UseImageGenerationOptions) {
  const { t } = useTranslation()
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      abortControllerRef.current?.abort()
    },
    []
  )

  const generateImage = useCallback(
    async (prompt: string) => {
      if (isGeneratingImage) return

      const model = resolveImageGenerationModel(
        options.config.model,
        options.models
      )
      const nextMessages = appendUserMessagePair(options.messages, prompt)
      const abortController = new AbortController()

      options.onMessageUpdate(nextMessages)
      abortControllerRef.current?.abort()
      abortControllerRef.current = abortController
      setIsGeneratingImage(true)

      try {
        const response = await sendImageGeneration(
          {
            group: options.config.group,
            model,
            n: 1,
            prompt,
            quality: model.startsWith('dall-e') ? 'standard' : 'auto',
            size: '1024x1024',
          },
          abortController.signal
        )
        if (abortController.signal.aborted) return

        const images = response.data.flatMap((item) => {
          if (item.url) return [item.url]
          if (item.b64_json) {
            return [`data:image/png;base64,${item.b64_json}`]
          }
          return []
        })
        if (images.length === 0) {
          throw new Error(t('Image not available'))
        }

        const revisedPrompt = response.data
          .map((item) => item.revised_prompt)
          .filter(Boolean)
          .join('\n')
        options.onMessageUpdate((previousMessages) =>
          updateLastAssistantMessage(previousMessages, (message) =>
            completeAssistantMessage({
              ...updateCurrentVersionContent(
                message,
                revisedPrompt || t('Generated image')
              ),
              generatedImages: images,
            })
          )
        )
      } catch (error: unknown) {
        if (abortController.signal.aborted) return
        const { errorCode, errorMessage } = parseRequestErrorDetails(error)
        toast.error(errorMessage)
        options.onMessageUpdate((previousMessages) =>
          updateAssistantMessageWithError(
            previousMessages,
            errorMessage,
            errorCode,
            t(ERROR_MESSAGES.API_REQUEST_ERROR)
          )
        )
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
          setIsGeneratingImage(false)
        }
      }
    },
    [isGeneratingImage, options, t]
  )

  const stopImageGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsGeneratingImage(false)
    options.onMessageUpdate((previousMessages) =>
      updateAssistantMessageWithError(
        previousMessages,
        t(ERROR_MESSAGES.INTERRUPTED)
      )
    )
  }, [options, t])

  return { generateImage, isGeneratingImage, stopImageGeneration }
}
