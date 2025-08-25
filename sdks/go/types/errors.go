package types

import "fmt"

// SDKError is the base error type for the SDK
type SDKError struct {
	Code    string
	Message string
	Cause   error
}

func (e *SDKError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s (caused by: %v)", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *SDKError) Unwrap() error {
	return e.Cause
}

// Error types
var (
	// ValidationError represents input validation errors
	ErrValidation = func(msg string, cause error) *SDKError {
		return &SDKError{
			Code:    "VALIDATION_ERROR",
			Message: msg,
			Cause:   cause,
		}
	}

	// NetworkError represents network-related errors
	ErrNetwork = func(msg string, cause error) *SDKError {
		return &SDKError{
			Code:    "NETWORK_ERROR",
			Message: msg,
			Cause:   cause,
		}
	}

	// SimulationError represents simulation-specific errors
	ErrSimulation = func(msg string, cause error) *SDKError {
		return &SDKError{
			Code:    "SIMULATION_ERROR",
			Message: msg,
			Cause:   cause,
		}
	}

	// TimeoutError represents timeout errors
	ErrTimeout = func(msg string, cause error) *SDKError {
		return &SDKError{
			Code:    "TIMEOUT_ERROR",
			Message: msg,
			Cause:   cause,
		}
	}

	// ConfigurationError represents configuration errors
	ErrConfiguration = func(msg string, cause error) *SDKError {
		return &SDKError{
			Code:    "CONFIGURATION_ERROR",
			Message: msg,
			Cause:   cause,
		}
	}

	// AIError represents AI service errors
	ErrAI = func(msg string, cause error) *SDKError {
		return &SDKError{
			Code:    "AI_ERROR",
			Message: msg,
			Cause:   cause,
		}
	}

	// WebSocketError represents WebSocket connection errors
	ErrWebSocket = func(msg string, cause error) *SDKError {
		return &SDKError{
			Code:    "WEBSOCKET_ERROR",
			Message: msg,
			Cause:   cause,
		}
	}

	// PluginError represents plugin system errors
	ErrPlugin = func(msg string, cause error) *SDKError {
		return &SDKError{
			Code:    "PLUGIN_ERROR",
			Message: msg,
			Cause:   cause,
		}
	}
)
