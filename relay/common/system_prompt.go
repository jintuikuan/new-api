package common

import (
	"encoding/json"
	"fmt"
	"strings"

	basecommon "github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
)

type SystemPromptApplyResult struct {
	Applied  bool
	Combined bool
	Mode     dto.SystemPromptMode
}

// ApplySystemPromptToChatRequest applies channel instructions to OpenAI-compatible
// chat messages before the request is converted to an upstream-specific protocol.
func ApplySystemPromptToChatRequest(request *dto.GeneralOpenAIRequest, setting dto.ChannelSettings) (SystemPromptApplyResult, error) {
	result := SystemPromptApplyResult{Mode: setting.EffectiveSystemPromptMode()}
	if request == nil || strings.TrimSpace(setting.SystemPrompt) == "" {
		return result, nil
	}
	switch result.Mode {
	case dto.SystemPromptModeFallback, dto.SystemPromptModePrepend, dto.SystemPromptModeAppend, dto.SystemPromptModeReplace:
	default:
		return result, fmt.Errorf("invalid system prompt mode: %s", result.Mode)
	}

	systemRole := request.GetSystemRoleName()
	systemMessageIndexes := make([]int, 0, 1)
	for i := range request.Messages {
		if request.Messages[i].Role == systemRole {
			systemMessageIndexes = append(systemMessageIndexes, i)
		}
	}

	prompt := setting.SystemPrompt
	if len(systemMessageIndexes) == 0 {
		request.Messages = append([]dto.Message{{Role: systemRole, Content: prompt}}, request.Messages...)
		result.Applied = true
		return result, nil
	}

	result.Combined = true
	switch result.Mode {
	case dto.SystemPromptModeFallback:
		result.Combined = false
		return result, nil
	case dto.SystemPromptModePrepend:
		if err := combineChatSystemMessage(&request.Messages[systemMessageIndexes[0]], prompt, true); err != nil {
			return result, err
		}
	case dto.SystemPromptModeAppend:
		lastIndex := systemMessageIndexes[len(systemMessageIndexes)-1]
		if err := combineChatSystemMessage(&request.Messages[lastIndex], prompt, false); err != nil {
			return result, err
		}
	case dto.SystemPromptModeReplace:
		messages := make([]dto.Message, 0, len(request.Messages)-len(systemMessageIndexes)+1)
		messages = append(messages, dto.Message{Role: systemRole, Content: prompt})
		for i := range request.Messages {
			if request.Messages[i].Role != systemRole {
				messages = append(messages, request.Messages[i])
			}
		}
		request.Messages = messages
	default:
		return result, fmt.Errorf("invalid system prompt mode: %s", result.Mode)
	}

	result.Applied = true
	return result, nil
}

// ApplySystemPromptToResponsesRequest applies channel instructions before the
// request is converted to an upstream-specific protocol.
func ApplySystemPromptToResponsesRequest(request *dto.OpenAIResponsesRequest, setting dto.ChannelSettings) (SystemPromptApplyResult, error) {
	result := SystemPromptApplyResult{Mode: setting.EffectiveSystemPromptMode()}
	if request == nil || strings.TrimSpace(setting.SystemPrompt) == "" {
		return result, nil
	}

	existing, hasExisting, err := responsesInstructionsText(request.Instructions)
	if err != nil {
		return result, err
	}

	prompt := setting.SystemPrompt
	var instructions string
	switch result.Mode {
	case dto.SystemPromptModeFallback:
		if hasExisting {
			return result, nil
		}
		instructions = prompt
	case dto.SystemPromptModePrepend:
		instructions = prompt
		if hasExisting {
			instructions += "\n\n" + existing
			result.Combined = true
		}
	case dto.SystemPromptModeAppend:
		instructions = prompt
		if hasExisting {
			instructions = existing + "\n\n" + prompt
			result.Combined = true
		}
	case dto.SystemPromptModeReplace:
		instructions = prompt
		result.Combined = hasExisting
	default:
		return result, fmt.Errorf("invalid system prompt mode: %s", result.Mode)
	}

	encoded, err := basecommon.Marshal(instructions)
	if err != nil {
		return result, err
	}
	request.Instructions = encoded
	result.Applied = true
	return result, nil
}

// PatchResponsesInstructions updates only the top-level instructions field so
// pass-through requests retain fields unknown to the current request DTO.
func PatchResponsesInstructions(data []byte, instructions json.RawMessage) ([]byte, error) {
	var body map[string]json.RawMessage
	if err := basecommon.Unmarshal(data, &body); err != nil {
		return nil, fmt.Errorf("decode pass-through responses request: %w", err)
	}
	if body == nil {
		return nil, fmt.Errorf("decode pass-through responses request: expected JSON object")
	}
	body["instructions"] = instructions
	return basecommon.Marshal(body)
}

// PatchChatMessages updates only the messages field so pass-through requests
// retain top-level fields unknown to the current request DTO.
func PatchChatMessages(data []byte, messages []dto.Message) ([]byte, error) {
	var body map[string]json.RawMessage
	if err := basecommon.Unmarshal(data, &body); err != nil {
		return nil, fmt.Errorf("decode pass-through chat request: %w", err)
	}
	if body == nil {
		return nil, fmt.Errorf("decode pass-through chat request: expected JSON object")
	}
	encoded, err := basecommon.Marshal(messages)
	if err != nil {
		return nil, err
	}
	body["messages"] = encoded
	return basecommon.Marshal(body)
}

func combineChatSystemMessage(message *dto.Message, prompt string, prepend bool) error {
	if message.IsStringContent() {
		existing := strings.TrimSpace(message.StringContent())
		if existing == "" {
			message.SetStringContent(prompt)
		} else if prepend {
			message.SetStringContent(prompt + "\n\n" + existing)
		} else {
			message.SetStringContent(existing + "\n\n" + prompt)
		}
		return nil
	}

	contents := message.ParseContent()
	if len(contents) == 0 {
		if message.Content != nil {
			return fmt.Errorf("invalid chat system message content")
		}
		message.SetStringContent(prompt)
		return nil
	}
	promptContent := dto.MediaContent{Type: dto.ContentTypeText, Text: prompt}
	if prepend {
		contents = append([]dto.MediaContent{promptContent}, contents...)
	} else {
		contents = append(contents, promptContent)
	}
	message.SetMediaContent(contents)
	return nil
}

func responsesInstructionsText(raw json.RawMessage) (string, bool, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return "", false, nil
	}

	var instructions string
	if err := basecommon.Unmarshal(raw, &instructions); err != nil {
		return "", false, fmt.Errorf("invalid responses instructions: %w", err)
	}
	instructions = strings.TrimSpace(instructions)
	return instructions, instructions != "", nil
}
