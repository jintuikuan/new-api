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
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Settings2 } from 'lucide-react'
import { formatLogQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getLogStats, getUserLogStats } from '../api'
import { getChannelGroups, updateChannelGroupStatus } from '@/features/channels/api'
import {
  DEFAULT_LOG_STATS,
  USAGE_LOGS_REFRESH_INTERVAL_MS,
} from '../constants'
import { buildApiParams } from '../lib/utils'
import { useLogsViewScope, useUsageLogsContext } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')

function StatBadge(props: {
  label: string
  value: string | number
  accent: string
}) {
  return (
    <span className='border-border/60 bg-muted/25 inline-flex h-7 items-center gap-2 rounded-md border px-2.5 text-xs shadow-xs'>
      <span className={cn('h-3.5 w-0.5 rounded-full', props.accent)} />
      <span className='text-muted-foreground'>{props.label}</span>
      <span className='text-foreground/85 font-mono font-semibold tabular-nums'>
        {props.value}
      </span>
    </span>
  )
}

export function CommonLogsStats() {
  const { t } = useTranslation()
  const { isAdminView: isAdmin } = useLogsViewScope()
  const searchParams = route.useSearch()
  const { sensitiveVisible } = useUsageLogsContext()
  const { data: channelGroups = [] } = useQuery({ queryKey: ['channel-groups'], queryFn: async () => (await getChannelGroups()).data || [], enabled: isAdmin })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['usage-logs-stats', isAdmin, searchParams],
    queryFn: async () => {
      const params = buildApiParams({
        page: 1,
        pageSize: 1,
        searchParams,
        columnFilters: [],
        isAdmin,
      })

      const result = isAdmin
        ? await getLogStats(params)
        : await getUserLogStats(params)

      return result.success
        ? result.data || DEFAULT_LOG_STATS
        : DEFAULT_LOG_STATS
    },
    placeholderData: (previousData) => previousData,
    refetchInterval: USAGE_LOGS_REFRESH_INTERVAL_MS,
  })

  if (isLoading) {
    return (
      <div className='flex items-center gap-2'>
        <Skeleton className='h-7 w-[150px] rounded-md' />
        <Skeleton className='h-7 w-[100px] rounded-md' />
        <Skeleton className='h-7 w-[120px] rounded-md' />
      </div>
    )
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <StatBadge
        label={t('Usage')}
        value={sensitiveVisible ? formatLogQuota(stats?.quota || 0) : '••••'}
        accent='bg-sky-500/70'
      />
      <StatBadge
        label={t('RPM')}
        value={stats?.rpm || 0}
        accent='bg-rose-500/65'
      />
      <StatBadge
        label={t('TPM')}
        value={stats?.tpm || 0}
        accent='bg-slate-400/70'
      />
      <StatBadge
        label={t('Cache Hit Rate')}
        value={`${(stats?.cache?.request_hit_rate || 0).toFixed(2)}%`}
        accent='bg-emerald-500/70'
      />
      <StatBadge
        label={t('Cached Tokens')}
        value={stats?.cache?.cached_tokens || 0}
        accent='bg-violet-500/70'
      />
      {(stats?.cache_by_channel?.length || 0) > 0 && (
        <div className='text-muted-foreground text-xs'>
          {t('Channels')}: {stats?.cache_by_channel?.map((item) => `${item.channel_name || `#${item.channel_id}`} ${item.request_hit_rate.toFixed(2)}%`).join(' · ')}
        </div>
      )}
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant='outline' size='sm' className='h-7 gap-1.5 px-2.5 text-xs' />}>
            <Settings2 className='h-3.5 w-3.5' />
            {t('Channel Groups')}
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start' className='w-56'>
            <DropdownMenuLabel>{t('Batch enable or disable channel groups')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {channelGroups.length === 0 ? (
              <DropdownMenuItem disabled>{t('No channel groups')}</DropdownMenuItem>
            ) : channelGroups.flatMap((group) => [
              <DropdownMenuItem key={`${group.id}-enable`} onClick={() => updateChannelGroupStatus(group.id, true)}>
                {t('Enable')} {group.name}
              </DropdownMenuItem>,
              <DropdownMenuItem key={`${group.id}-disable`} onClick={() => updateChannelGroupStatus(group.id, false)}>
                {t('Disable')} {group.name}
              </DropdownMenuItem>,
            ])}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
