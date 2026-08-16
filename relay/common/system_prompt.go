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
