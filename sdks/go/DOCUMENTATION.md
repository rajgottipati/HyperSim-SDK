# HyperSim Go SDK Documentation

A comprehensive, concurrent Go SDK for HyperEVM transaction simulation with AI-powered analysis and cross-layer HyperCore integration.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Features](#core-features)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Plugin System](#plugin-system)
8. [WebSocket Streaming](#websocket-streaming)
9. [Error Handling](#error-handling)
10. [Performance Considerations](#performance-considerations)
11. [Examples](#examples)
12. [Contributing](#contributing)

## Overview

The HyperSim Go SDK provides a powerful, production-ready interface for interacting with HyperEVM networks. Built from the ground up with Go's concurrency model, it offers:

- **High Performance**: Goroutine-based concurrent operations
- **Production Ready**: Comprehensive error handling, logging, and metrics
- **AI Integration**: OpenAI-powered transaction analysis and optimization
- **Cross-layer Support**: Native HyperCore integration with ABI encoding
- **Real-time Streaming**: WebSocket support for live data
- **Extensible**: Plugin system with dependency injection
- **Type Safe**: Full type safety with detailed error types

## Installation

```bash
go get github.com/hypersim/hypersim-go-sdk
```

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
    // Initialize SDK
    config := &hypersim.Config{
        Network:           types.NetworkTestnet,
        AIEnabled:         true,
        OpenAIAPIKey:      "your-api-key",
        CrossLayerEnabled: true,
        Debug:            true,
    }

    sdk, err := hypersim.New(config)
    if err != nil {
        log.Fatal(err)
    }
    defer sdk.Close()

    // Create context
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

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

    fmt.Printf("Success: %t, Gas: %s\n", result.Success, result.GasUsed)

    // Get AI insights
    if config.AIEnabled {
        insights, err := sdk.GetAIInsights(ctx, result)
        if err == nil {
            fmt.Printf("Risk Level: %s\n", insights.RiskLevel)
        }
    }
}
```

For detailed documentation, see the full DOCUMENTATION.md file.
