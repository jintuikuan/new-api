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
import { DownloadIcon, FileIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import { Loader } from '@/components/ai-elements/loader'
import { MessageContent } from '@/components/ai-elements/message'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Response } from '@/components/ai-elements/response'
import { Shimmer } from '@/components/ai-elements/shimmer'
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources'
import { cn } from '@/lib/utils'

import { MESSAGE_STATUS } from '../../constants'
import {
  getMessageAlignmentClass,
  getMessageContentState,
  isErrorMessage,
  type MessageAlignment,
} from '../../lib'
import { getMessageContentStyles } from '../../lib/message/message-styles'
import type { Message } from '../../types'
import { MessageError } from './message-error'
import { MessageMetadata } from './message-metadata'

type PlaygroundMessageContentProps = {
  actions: ReactNode
  alignment: MessageAlignment
  errorActions?: ReactNode
  isSourceVisible?: boolean
  message: Message
  versionContent: string
}

export function PlaygroundMessageContent({
  actions,
  alignment,
  errorActions,
  isSourceVisible = false,
  message,
  versionContent,
}: PlaygroundMessageContentProps) {
  const { t } = useTranslation()
  const {
    displayContent,
    hasReasoning,
    hasSources,
    reasoningContent,
    showLoader,
    showMessageContent,
    sources,
  } = getMessageContentState(message, versionContent)
  const isError = isErrorMessage(message)
  const attachments = message.attachments ?? []
  const generatedImages = message.generatedImages ?? []
  const hasMedia = attachments.length > 0 || generatedImages.length > 0
  const isMessageFinal =
    message.status !== MESSAGE_STATUS.LOADING &&
    message.status !== MESSAGE_STATUS.STREAMING

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col',
        getMessageAlignmentClass(alignment)
      )}
    >
      {hasSources && (
        <Sources>
          <SourcesTrigger count={sources.length} />
          <SourcesContent>
            {sources.map((source) => (
              <Source
                href={source.href}
                key={`${source.href}-${source.title}`}
                title={source.title}
              />
            ))}
          </SourcesContent>
        </Sources>
      )}

      {hasReasoning && (
        <Reasoning
          defaultOpen
          duration={message.reasoning?.duration}
          isStreaming={message.isReasoningStreaming}
        >
          <ReasoningTrigger />
          <ReasoningContent>{reasoningContent}</ReasoningContent>
        </Reasoning>
      )}

      {showLoader && (
        <div className='flex items-center gap-2 py-2'>
          <Loader />
          <Shimmer className='text-sm' duration={1}>
            {t('Responding...')}
          </Shimmer>
        </div>
      )}

      {attachments.length > 0 && (
        <div className='mb-2 flex max-w-2xl flex-wrap justify-end gap-2'>
          {attachments.map((attachment) =>
            attachment.type === 'image' ? (
              <a
                className='border-border bg-muted/30 overflow-hidden rounded-lg border'
                href={attachment.dataUrl}
                key={`${attachment.filename}-${attachment.dataUrl.length}`}
                rel='noreferrer'
                target='_blank'
              >
                <img
                  alt={attachment.filename}
                  className='max-h-64 max-w-64 object-contain'
                  src={attachment.dataUrl}
                />
              </a>
            ) : (
              <div
                className='border-border bg-muted/40 flex max-w-64 items-center gap-2 rounded-lg border px-3 py-2'
                key={`${attachment.filename}-${attachment.dataUrl.length}`}
              >
                <FileIcon className='text-muted-foreground size-4 shrink-0' />
                <span className='truncate text-sm'>{attachment.filename}</span>
              </div>
            )
          )}
        </div>
      )}

      {generatedImages.length > 0 && (
        <div className='mb-3 grid w-full max-w-2xl gap-3 sm:grid-cols-2'>
          {generatedImages.map((image, index) => (
            <figure
              className='border-border bg-muted/20 group/image relative overflow-hidden rounded-xl border'
              key={image}
            >
              <img
                alt={`${t('Generated image')} ${index + 1}`}
                className='aspect-square w-full object-contain'
                src={image}
              />
              <a
                aria-label={t('Download')}
                className='bg-background/85 text-foreground absolute top-2 right-2 flex size-9 items-center justify-center rounded-lg opacity-0 shadow-sm backdrop-blur transition-opacity group-hover/image:opacity-100 focus:opacity-100'
                download={`generated-image-${index + 1}.png`}
                href={image}
              >
                <DownloadIcon className='size-4' />
              </a>
            </figure>
          ))}
        </div>
      )}

      {isError && (
        <>
          <MessageError message={message} className='mb-2' />
          <MessageMetadata alignment={alignment} message={message} />
          {errorActions}
        </>
      )}

      {!isError && (showMessageContent || hasMedia) && (
        <>
          {showMessageContent && isSourceVisible && (
            <CodeBlock
              code={versionContent}
              className='my-0 group-[.is-assistant]:w-full group-[.is-assistant]:max-w-[78ch]'
              collapsedLines={24}
              defaultCollapsed={false}
              language='markdown'
              maxExpandedLines={48}
              showLineNumbers
              showToolbar
              title={t('Raw response')}
            >
              <CodeBlockCopyButton />
            </CodeBlock>
          )}
          {showMessageContent && !isSourceVisible && (
            <MessageContent
              variant='flat'
              className={cn(getMessageContentStyles())}
            >
              <Response final={isMessageFinal}>{displayContent}</Response>
            </MessageContent>
          )}
          <MessageMetadata alignment={alignment} message={message} />
          {actions}
        </>
      )}
    </div>
  )
}
