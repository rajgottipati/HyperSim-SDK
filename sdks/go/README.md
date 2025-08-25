# HyperSim Go SDK

A concurrent Go SDK for HyperEVM transaction simulation with AI-powered analysis and cross-layer HyperCore integration.

## Features

- **Concurrent Operations**: Built from ground-up using goroutines for maximum performance
- **Context Support**: Full context.Context integration for cancellation and timeouts
- **Connection Pooling**: Efficient HTTP connection pooling with net/http
- **WebSocket Streaming**: Real-time data streaming using gorilla/websocket
- **Plugin System**: Extensible architecture with dependency injection
- **Cross-layer Integration**: Seamless HyperCore integration with proper ABI encoding
- **AI-Powered Analysis**: Transaction optimization and risk assessment
- **Structured Errors**: Custom error types with detailed context
- **Production Ready**: Comprehensive logging, metrics, and error handling

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/hypersim/hypersim-go-sdk/hypersim"
    "github.com/hypersim/hypersim-go-sdk/types"
)

func main() {
    // Initialize SDK with context
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    config := &hypersim.Config{
        Network:           types.NetworkMainnet,
        AIEnabled:         true,
        OpenAIAPIKey:      "your-api-key",
        CrossLayerEnabled: true,
        StreamingEnabled:  true,
        Debug:            true,
    }

    sdk, err := hypersim.New(config)
    if err != nil {
        log.Fatal(err)
    }
    defer sdk.Close()

    // Simulate transaction
    tx := &types.TransactionRequest{
        From:     "0x742d35Cc6634C0532925a3b8D9C1ddcFab6E4444",
        To:       "0xA0b86a33E6417A9cDdA68C73E2c96b4DA3AEFc43",
        Value:    "1000000000000000000", // 1 ETH
        GasLimit: "21000",
    }

    result, err := sdk.Simulate(ctx, tx)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Simulation Result: Success=%t, GasUsed=%s\n", result.Success, result.GasUsed)

    // Get AI insights if available
    if config.AIEnabled {
        insights, err := sdk.GetAIInsights(ctx, result)
        if err == nil {
            fmt.Printf("AI Risk Level: %s\n", insights.RiskLevel)
        }
    }
}
```

## Installation

```bash
go get github.com/hypersim/hypersim-go-sdk
```

## Documentation

For detailed documentation and examples, visit the [examples](./examples) directory.

## License

MIT License - see [LICENSE](./LICENSE) for details.
