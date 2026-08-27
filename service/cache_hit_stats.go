package service

import (
	"sync"
	"time"

	"github.com/QuantumNous/new-api/relaykit/dto"
)

// UpstreamCacheHitStats summarizes upstream prompt-cache usage since the last
// process start or explicit reset. The counters are process-local so they stay
// available without requiring Redis and remain cheap on the relay hot path.
type UpstreamCacheHitStats struct {
	TotalRequests        int64   `json:"total_requests"`
	CacheHitRequests     int64   `json:"cache_hit_requests"`
	CacheMissRequests    int64   `json:"cache_miss_requests"`
	CacheHitRate         float64 `json:"cache_hit_rate"`
	CachedTokens         int64   `json:"cached_tokens"`
	PromptCacheHitTokens int64   `json:"prompt_cache_hit_tokens"`
	PromptTokens         int64   `json:"prompt_tokens"`
	TotalTokens          int64   `json:"total_tokens"`
	LastSeenAt           int64   `json:"last_seen_at"`
}

var upstreamCacheHitCounters struct {
	sync.RWMutex
	totalRequests        int64
	cacheHitRequests     int64
	cachedTokens         int64
	promptCacheHitTokens int64
	promptTokens         int64
	totalTokens          int64
	lastSeenAt           int64
}

// ObserveUpstreamCacheHit records one completed upstream request with usage.
func ObserveUpstreamCacheHit(usage *dto.Usage) {
	if !hasObservableUpstreamCacheUsage(usage) {
		return
	}

	hit, cachedTokens, promptCacheHitTokens := usageCacheSignals(usage)
	upstreamCacheHitCounters.Lock()
	defer upstreamCacheHitCounters.Unlock()

	upstreamCacheHitCounters.totalRequests++
	if hit {
		upstreamCacheHitCounters.cacheHitRequests++
	}
	upstreamCacheHitCounters.cachedTokens += cachedTokens
	upstreamCacheHitCounters.promptCacheHitTokens += promptCacheHitTokens
	upstreamCacheHitCounters.promptTokens += int64(usagePromptTokens(usage))
	upstreamCacheHitCounters.totalTokens += int64(usageTotalTokens(usage))
	upstreamCacheHitCounters.lastSeenAt = time.Now().Unix()
}

func GetUpstreamCacheHitStats() UpstreamCacheHitStats {
	upstreamCacheHitCounters.RLock()
	defer upstreamCacheHitCounters.RUnlock()

	totalRequests := upstreamCacheHitCounters.totalRequests
	cacheHitRequests := upstreamCacheHitCounters.cacheHitRequests
	cacheHitRate := 0.0
	if totalRequests > 0 {
		cacheHitRate = float64(cacheHitRequests) / float64(totalRequests) * 100
	}

	return UpstreamCacheHitStats{
		TotalRequests:        totalRequests,
		CacheHitRequests:     cacheHitRequests,
		CacheMissRequests:    totalRequests - cacheHitRequests,
		CacheHitRate:         cacheHitRate,
		CachedTokens:         upstreamCacheHitCounters.cachedTokens,
		PromptCacheHitTokens: upstreamCacheHitCounters.promptCacheHitTokens,
		PromptTokens:         upstreamCacheHitCounters.promptTokens,
		TotalTokens:          upstreamCacheHitCounters.totalTokens,
		LastSeenAt:           upstreamCacheHitCounters.lastSeenAt,
	}
}

func ResetUpstreamCacheHitStats() {
	upstreamCacheHitCounters.Lock()
	defer upstreamCacheHitCounters.Unlock()

	upstreamCacheHitCounters.totalRequests = 0
	upstreamCacheHitCounters.cacheHitRequests = 0
	upstreamCacheHitCounters.cachedTokens = 0
	upstreamCacheHitCounters.promptCacheHitTokens = 0
	upstreamCacheHitCounters.promptTokens = 0
	upstreamCacheHitCounters.totalTokens = 0
	upstreamCacheHitCounters.lastSeenAt = 0
}

func hasObservableUpstreamCacheUsage(usage *dto.Usage) bool {
	if usage == nil {
		return false
	}
	hit, _, _ := usageCacheSignals(usage)
	return hit || usagePromptTokens(usage) > 0 || usageCompletionTokens(usage) > 0 || usageTotalTokens(usage) > 0
}
