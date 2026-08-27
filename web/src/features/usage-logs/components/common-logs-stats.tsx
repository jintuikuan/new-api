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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
  const queryClient = useQueryClient()
  const { data: channelGroups = [] } = useQuery({
    queryKey: ['channel-groups'],
    queryFn: async () => {
      const result = await getChannelGroups()
      return Array.isArray(result.data) ? result.data : []
    },
    enabled: isAdmin,
  })

  const handleGroupStatus = async (group: (typeof channelGroups)[number], enabled: boolean) => {
    const result = await updateChannelGroupStatus(group.id, enabled)
    if (!result.success) {
      toast.error(t('Operation failed'))
      return
    }
    toast.success(t('Channel group {{name}} {{status}} ({{count}} channels)', {
      name: group.name,
      status: enabled ? t('enabled') : t('disabled'),
      count: result.data || 0,
    }))
    await queryClient.invalidateQueries({ queryKey: ['channel-groups'] })
    await queryClient.invalidateQueries({ queryKey: ['usage-logs-stats'] })
  }

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
        <details className='relative'>
          <summary className='border-input bg-background hover:bg-accent inline-flex h-7 cursor-pointer list-none items-center gap-1.5 rounded-md border px-2.5 text-xs'>
            <Settings2 className='h-3.5 w-3.5' />
            {t('Channel Groups')}
          </summary>
          <div className='bg-popover text-popover-foreground absolute left-0 top-8 z-50 w-56 rounded-md border p-2 shadow-md'>
            <div className='text-muted-foreground px-2 py-1 text-xs'>{t('Batch enable or disable channel groups')}</div>
            {channelGroups.length === 0 ? <div className='text-muted-foreground px-2 py-2 text-xs'>{t('No channel groups')}</div> : channelGroups.map((group) => (
              <div key={group.id} className='flex items-center justify-between gap-2 px-2 py-1'>
                <span className='truncate text-xs'>{group.name} <span className='text-muted-foreground'>({group.enabled_count || 0}/{group.channel_count || group.channel_ids.length}) {group.enabled ? t('Active') : t('Inactive')}</span></span>
                <span className='flex gap-1'>
                  <Button variant='ghost' size='sm' className='h-6 px-1.5 text-xs' onClick={() => handleGroupStatus(group, true)}>{t('Enable')}</Button>
                  <Button variant='ghost' size='sm' className='h-6 px-1.5 text-xs' onClick={() => handleGroupStatus(group, false)}>{t('Disable')}</Button>
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
