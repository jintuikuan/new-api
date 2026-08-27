package service

import (
	"sync"
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/require"
)

func TestUpstreamCacheHitStatsTracksHitsAndMisses(t *testing.T) {
	ResetUpstreamCacheHitStats()
	t.Cleanup(ResetUpstreamCacheHitStats)

	ObserveUpstreamCacheHit(&dto.Usage{
		PromptTokens: 100,
		TotalTokens:  140,
		PromptTokensDetails: dto.InputTokenDetails{
			CachedTokens: 30,
		},
	})
	ObserveUpstreamCacheHit(&dto.Usage{
		PromptTokens:     80,
		CompletionTokens: 20,
		TotalTokens:      100,
	})

	stats := GetUpstreamCacheHitStats()
	require.EqualValues(t, 2, stats.TotalRequests)
	require.EqualValues(t, 1, stats.CacheHitRequests)
	require.EqualValues(t, 1, stats.CacheMissRequests)
	require.Equal(t, 50.0, stats.CacheHitRate)
	require.EqualValues(t, 30, stats.CachedTokens)
	require.EqualValues(t, 180, stats.PromptTokens)
	require.EqualValues(t, 240, stats.TotalTokens)
	require.Positive(t, stats.LastSeenAt)
}

func TestUpstreamCacheHitStatsCountsPromptCacheHitTokens(t *testing.T) {
	ResetUpstreamCacheHitStats()
	t.Cleanup(ResetUpstreamCacheHitStats)

	ObserveUpstreamCacheHit(&dto.Usage{PromptCacheHitTokens: 12})

	stats := GetUpstreamCacheHitStats()
	require.EqualValues(t, 1, stats.TotalRequests)
	require.EqualValues(t, 1, stats.CacheHitRequests)
	require.EqualValues(t, 0, stats.CacheMissRequests)
	require.EqualValues(t, 12, stats.PromptCacheHitTokens)
	require.Equal(t, 100.0, stats.CacheHitRate)
}

func TestUpstreamCacheHitStatsSkipsEmptyUsage(t *testing.T) {
	ResetUpstreamCacheHitStats()
	t.Cleanup(ResetUpstreamCacheHitStats)

	ObserveUpstreamCacheHit(&dto.Usage{})

	stats := GetUpstreamCacheHitStats()
	require.Zero(t, stats.TotalRequests)
	require.Zero(t, stats.CacheHitRequests)
	require.Zero(t, stats.CacheMissRequests)
}

func TestUpstreamCacheHitStatsKeepsConcurrentSnapshotsConsistent(t *testing.T) {
	ResetUpstreamCacheHitStats()
	t.Cleanup(ResetUpstreamCacheHitStats)

	usage := &dto.Usage{
		PromptTokens: 1,
		PromptTokensDetails: dto.InputTokenDetails{
			CachedTokens: 1,
		},
	}
	var writers sync.WaitGroup
	for range 8 {
		writers.Go(func() {
			for range 100 {
				ObserveUpstreamCacheHit(usage)
			}
		})
	}

	for range 1000 {
		stats := GetUpstreamCacheHitStats()
		require.GreaterOrEqual(t, stats.TotalRequests, stats.CacheHitRequests)
		require.GreaterOrEqual(t, stats.CacheMissRequests, int64(0))
		require.Equal(t, stats.TotalRequests, stats.CacheHitRequests+stats.CacheMissRequests)
	}
	writers.Wait()

	stats := GetUpstreamCacheHitStats()
	require.EqualValues(t, 800, stats.TotalRequests)
	require.EqualValues(t, 800, stats.CacheHitRequests)
}

func TestUpstreamCacheHitStatsKeepsSnapshotsConsistentDuringReset(t *testing.T) {
	ResetUpstreamCacheHitStats()
	t.Cleanup(ResetUpstreamCacheHitStats)

	usage := &dto.Usage{PromptTokens: 1}
	var workers sync.WaitGroup
	workers.Go(func() {
		for range 1000 {
			ObserveUpstreamCacheHit(usage)
		}
	})
	workers.Go(func() {
		for range 100 {
			ResetUpstreamCacheHitStats()
		}
	})

	for range 1000 {
		stats := GetUpstreamCacheHitStats()
		require.GreaterOrEqual(t, stats.TotalRequests, stats.CacheHitRequests)
		require.GreaterOrEqual(t, stats.CacheMissRequests, int64(0))
		require.Equal(t, stats.TotalRequests, stats.CacheHitRequests+stats.CacheMissRequests)
	}
	workers.Wait()
}
