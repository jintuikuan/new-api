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
import { describe, expect, test } from 'vitest'

import { channelSchema } from '../../types'
import {
  buildSettingJSON,
  CHANNEL_FORM_DEFAULT_VALUES,
  normalizeSystemPromptMode,
  transformChannelToFormDefaults,
} from '../channel-form'

function channelWithSetting(setting: Record<string, unknown>) {
  return channelSchema.parse({
    id: 1,
    type: 1,
    key: '',
    status: 1,
    name: 'test channel',
    created_time: 1,
    test_time: 1,
    response_time: 1,
    balance_updated_time: 1,
    setting: JSON.stringify(setting),
  })
}

describe('system prompt mode', () => {
  test('maps the legacy concatenation flag to prepend mode', () => {
    expect(normalizeSystemPromptMode(undefined, true)).toBe('prepend')

    const values = transformChannelToFormDefaults(
      channelWithSetting({
        system_prompt: 'legacy rule',
        system_prompt_override: true,
      })
    )

    expect(values.system_prompt_mode).toBe('prepend')
  })

  test('persists append mode with the legacy compatibility flag', () => {
    const setting = JSON.parse(
      buildSettingJSON({
        ...CHANNEL_FORM_DEFAULT_VALUES,
        system_prompt: 'persistent rule',
        system_prompt_mode: 'append',
      })
    )

    expect(setting.system_prompt).toBe('persistent rule')
    expect(setting.system_prompt_mode).toBe('append')
    expect(setting.system_prompt_override).toBe(true)
  })
})
