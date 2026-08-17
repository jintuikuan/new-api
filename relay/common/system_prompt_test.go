package common

import (
	"encoding/json"
	"testing"

	basecommon "github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestApplySystemPromptToResponsesRequest(t *testing.T) {
	tests := []struct {
		name             string
		setting          dto.ChannelSettings
		instructions     json.RawMessage
		wantInstructions string
		wantApplied      bool
		wantCombined     bool
		wantMode         dto.SystemPromptMode
	}{
		{
			name:             "fallback fills missing instructions",
			setting:          dto.ChannelSettings{SystemPrompt: "channel rule"},
			wantInstructions: "channel rule",
			wantApplied:      true,
			wantMode:         dto.SystemPromptModeFallback,
		},
		{
			name:             "fallback preserves client instructions",
			setting:          dto.ChannelSettings{SystemPrompt: "channel rule"},
			instructions:     mustRawString(t, "client rule"),
			wantInstructions: "client rule",
			wantMode:         dto.SystemPromptModeFallback,
		},
		{
			name: "legacy override prepends for compatibility",
			setting: dto.ChannelSettings{
				SystemPrompt:         "channel rule",
				SystemPromptOverride: true,
			},
			instructions:     mustRawString(t, "client rule"),
			wantInstructions: "channel rule\n\nclient rule",
			wantApplied:      true,
			wantCombined:     true,
			wantMode:         dto.SystemPromptModePrepend,
		},
		{
			name: "append places persistent rules last",
			setting: dto.ChannelSettings{
				SystemPrompt:     "channel rule",
				SystemPromptMode: dto.SystemPromptModeAppend,
			},
			instructions:     mustRawString(t, "client rule"),
			wantInstructions: "client rule\n\nchannel rule",
			wantApplied:      true,
			wantCombined:     true,
			wantMode:         dto.SystemPromptModeAppend,
		},
		{
			name: "replace removes client instructions",
			setting: dto.ChannelSettings{
				SystemPrompt:     "channel rule",
				SystemPromptMode: dto.SystemPromptModeReplace,
			},
			instructions:     mustRawString(t, "client rule"),
			wantInstructions: "channel rule",
			wantApplied:      true,
			wantCombined:     true,
			wantMode:         dto.SystemPromptModeReplace,
		},
		{
			name: "append treats blank instructions as missing",
			setting: dto.ChannelSettings{
				SystemPrompt:     "channel rule",
				SystemPromptMode: dto.SystemPromptModeAppend,
			},
			instructions:     mustRawString(t, "  "),
			wantInstructions: "channel rule",
			wantApplied:      true,
			wantMode:         dto.SystemPromptModeAppend,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := &dto.OpenAIResponsesRequest{Instructions: tt.instructions}
			result, err := ApplySystemPromptToResponsesRequest(request, tt.setting)
			require.NoError(t, err)
			assert.Equal(t, tt.wantApplied, result.Applied)
			assert.Equal(t, tt.wantCombined, result.Combined)
			assert.Equal(t, tt.wantMode, result.Mode)
			assert.Equal(t, tt.wantInstructions, rawStringValue(t, request.Instructions))
		})
	}
}

func TestApplySystemPromptToChatRequest(t *testing.T) {
	tests := []struct {
		name         string
		setting      dto.ChannelSettings
		messages     []dto.Message
		wantMessages []dto.Message
		wantApplied  bool
		wantCombined bool
		wantMode     dto.SystemPromptMode
	}{
		{
			name:         "fallback fills missing system message",
			setting:      dto.ChannelSettings{SystemPrompt: "channel rule"},
			messages:     []dto.Message{{Role: "user", Content: "hello"}},
			wantMessages: []dto.Message{{Role: "system", Content: "channel rule"}, {Role: "user", Content: "hello"}},
			wantApplied:  true,
			wantMode:     dto.SystemPromptModeFallback,
		},
		{
			name:         "fallback preserves client system message",
			setting:      dto.ChannelSettings{SystemPrompt: "channel rule"},
			messages:     []dto.Message{{Role: "system", Content: "client rule"}, {Role: "user", Content: "hello"}},
			wantMessages: []dto.Message{{Role: "system", Content: "client rule"}, {Role: "user", Content: "hello"}},
			wantMode:     dto.SystemPromptModeFallback,
		},
		{
			name: "legacy override prepends for compatibility",
			setting: dto.ChannelSettings{
				SystemPrompt:         "channel rule",
				SystemPromptOverride: true,
			},
			messages:     []dto.Message{{Role: "system", Content: "client rule"}},
			wantMessages: []dto.Message{{Role: "system", Content: "channel rule\n\nclient rule"}},
			wantApplied:  true,
			wantCombined: true,
			wantMode:     dto.SystemPromptModePrepend,
		},
		{
			name: "append places persistent rule after the last system message",
			setting: dto.ChannelSettings{
				SystemPrompt:     "channel rule",
				SystemPromptMode: dto.SystemPromptModeAppend,
			},
			messages: []dto.Message{
				{Role: "system", Content: "first rule"},
				{Role: "system", Content: "last rule"},
				{Role: "user", Content: "hello"},
			},
			wantMessages: []dto.Message{
				{Role: "system", Content: "first rule"},
				{Role: "system", Content: "last rule\n\nchannel rule"},
				{Role: "user", Content: "hello"},
			},
			wantApplied:  true,
			wantCombined: true,
			wantMode:     dto.SystemPromptModeAppend,
		},
		{
			name: "replace removes every client system message",
			setting: dto.ChannelSettings{
				SystemPrompt:     "channel rule",
				SystemPromptMode: dto.SystemPromptModeReplace,
			},
			messages: []dto.Message{
				{Role: "system", Content: "first rule"},
				{Role: "user", Content: "hello"},
				{Role: "system", Content: "second rule"},
			},
			wantMessages: []dto.Message{
				{Role: "system", Content: "channel rule"},
				{Role: "user", Content: "hello"},
			},
			wantApplied:  true,
			wantCombined: true,
			wantMode:     dto.SystemPromptModeReplace,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := &dto.GeneralOpenAIRequest{Model: "deepseek-chat", Messages: tt.messages}
			result, err := ApplySystemPromptToChatRequest(request, tt.setting)
			require.NoError(t, err)
			assert.Equal(t, tt.wantApplied, result.Applied)
			assert.Equal(t, tt.wantCombined, result.Combined)
			assert.Equal(t, tt.wantMode, result.Mode)
			assert.Equal(t, tt.wantMessages, request.Messages)
		})
	}
}

func TestApplySystemPromptToChatRequestAppendsStructuredContent(t *testing.T) {
	request := &dto.GeneralOpenAIRequest{
		Model: "deepseek-chat",
		Messages: []dto.Message{{
			Role: "system",
			Content: []any{
				map[string]any{"type": dto.ContentTypeText, "text": "client rule"},
			},
		}},
	}

	result, err := ApplySystemPromptToChatRequest(request, dto.ChannelSettings{
		SystemPrompt:     "channel rule",
		SystemPromptMode: dto.SystemPromptModeAppend,
	})
	require.NoError(t, err)
	require.True(t, result.Applied)
	assert.Equal(t, []dto.MediaContent{
		{Type: dto.ContentTypeText, Text: "client rule"},
		{Type: dto.ContentTypeText, Text: "channel rule"},
	}, request.Messages[0].Content)
}

func TestApplySystemPromptToResponsesRequestRejectsNonStringInstructions(t *testing.T) {
	request := &dto.OpenAIResponsesRequest{Instructions: json.RawMessage(`{"unexpected":true}`)}

	_, err := ApplySystemPromptToResponsesRequest(request, dto.ChannelSettings{
		SystemPrompt:     "channel rule",
		SystemPromptMode: dto.SystemPromptModeAppend,
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid responses instructions")
}

func TestPatchResponsesInstructionsPreservesUnknownFields(t *testing.T) {
	original := []byte(`{"model":"gpt-test","instructions":"old","future_field":{"enabled":true},"large_number":12345678901234567890}`)
	patched, err := PatchResponsesInstructions(original, mustRawString(t, "new"))
	require.NoError(t, err)

	var body map[string]json.RawMessage
	require.NoError(t, basecommon.Unmarshal(patched, &body))
	assert.Equal(t, "new", rawStringValue(t, body["instructions"]))
	assert.JSONEq(t, `{"enabled":true}`, string(body["future_field"]))
	assert.Equal(t, "12345678901234567890", string(body["large_number"]))
}

func TestPatchChatMessagesPreservesUnknownFields(t *testing.T) {
	original := []byte(`{"model":"deepseek-chat","messages":[{"role":"user","content":"hello"}],"future_field":{"enabled":true},"large_number":12345678901234567890}`)
	patched, err := PatchChatMessages(original, []dto.Message{
		{Role: "system", Content: "channel rule"},
		{Role: "user", Content: "hello"},
	})
	require.NoError(t, err)

	var body map[string]json.RawMessage
	require.NoError(t, basecommon.Unmarshal(patched, &body))
	assert.JSONEq(t, `[{"role":"system","content":"channel rule"},{"role":"user","content":"hello"}]`, string(body["messages"]))
	assert.JSONEq(t, `{"enabled":true}`, string(body["future_field"]))
	assert.Equal(t, "12345678901234567890", string(body["large_number"]))
}

func mustRawString(t *testing.T, value string) json.RawMessage {
	t.Helper()
	data, err := basecommon.Marshal(value)
	require.NoError(t, err)
	return data
}

func rawStringValue(t *testing.T, raw json.RawMessage) string {
	t.Helper()
	if len(raw) == 0 {
		return ""
	}
	var value string
	require.NoError(t, basecommon.Unmarshal(raw, &value))
	return value
}
