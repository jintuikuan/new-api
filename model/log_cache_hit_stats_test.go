package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
)

func TestSumCacheHitStatsAggregatesFilteredConsumeLogs(t *testing.T) {
	require.NoError(t, LOG_DB.Exec("DELETE FROM logs").Error)
	t.Cleanup(func() { LOG_DB.Exec("DELETE FROM logs") })

	logs := []Log{
		{Type: LogTypeConsume, CreatedAt: 100, Username: "alice", ModelName: "gpt", PromptTokens: 80, Other: common.MapToJsonStr(map[string]interface{}{"cache_tokens": 20, "input_tokens_total": 100})},
		{Type: LogTypeConsume, CreatedAt: 101, Username: "alice", ModelName: "gpt", PromptTokens: 50, Other: common.MapToJsonStr(map[string]interface{}{})},
		{Type: LogTypeManage, CreatedAt: 100, Username: "alice", ModelName: "gpt", PromptTokens: 999, Other: common.MapToJsonStr(map[string]interface{}{"cache_tokens": 999})},
		{Type: LogTypeConsume, CreatedAt: 100, Username: "bob", ModelName: "gpt", PromptTokens: 100, Other: common.MapToJsonStr(map[string]interface{}{"prompt_cache_hit_tokens": 10})},
	}
	for i := range logs {
		require.NoError(t, LOG_DB.Create(&logs[i]).Error)
	}

	stats, err := SumCacheHitStats(0, 100, 101, "gpt", "alice", "", 0, "")
	require.NoError(t, err)
	require.EqualValues(t, 2, stats.TotalRequests)
	require.EqualValues(t, 1, stats.CacheHitRequests)
	require.EqualValues(t, 1, stats.CacheMissRequests)
	require.EqualValues(t, 20, stats.CachedTokens)
	require.EqualValues(t, 150, stats.TotalInputTokens)
	require.Equal(t, 50.0, stats.RequestHitRate)
	require.InDelta(t, 13.3333, stats.TokenHitRate, 0.001)
}
