package pool

import (
	"context"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/hypersim/hypersim-go-sdk/utils"
)

// HTTPPool manages a pool of HTTP clients with connection pooling
type HTTPPool struct {
	mu      sync.RWMutex
	clients map[string]*http.Client
	config  *PoolConfig
}

// PoolConfig contains configuration for the HTTP connection pool
type PoolConfig struct {
	MaxConnections     int
	MaxIdleConnections int
	IdleConnTimeout    time.Duration
	DialTimeout        time.Duration
	KeepAlive          time.Duration
	TLSHandshakeTimeout time.Duration
	ResponseHeaderTimeout time.Duration
}

// DefaultPoolConfig returns a default pool configuration
func DefaultPoolConfig() *PoolConfig {
	return &PoolConfig{
		MaxConnections:        utils.ConnectionPoolSize,
		MaxIdleConnections:    utils.MaxIdleConnections,
		IdleConnTimeout:       utils.IdleConnTimeout,
		DialTimeout:           10 * time.Second,
		KeepAlive:             30 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second,
	}
}

// NewHTTPPool creates a new HTTP connection pool
func NewHTTPPool(config *PoolConfig) *HTTPPool {
	if config == nil {
		config = DefaultPoolConfig()
	}
	
	return &HTTPPool{
		clients: make(map[string]*http.Client),
		config:  config,
	}
}

// GetClient returns an HTTP client for the given endpoint
func (p *HTTPPool) GetClient(endpoint string) *http.Client {
	p.mu.RLock()
	client, exists := p.clients[endpoint]
	p.mu.RUnlock()
	
	if exists {
		return client
	}
	
	p.mu.Lock()
	defer p.mu.Unlock()
	
	// Double-check after acquiring write lock
	if client, exists := p.clients[endpoint]; exists {
		return client
	}
	
	// Create new client with custom transport
	transport := &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   p.config.DialTimeout,
			KeepAlive: p.config.KeepAlive,
		}).DialContext,
		MaxIdleConns:          p.config.MaxConnections,
		MaxIdleConnsPerHost:   p.config.MaxIdleConnections,
		IdleConnTimeout:       p.config.IdleConnTimeout,
		TLSHandshakeTimeout:   p.config.TLSHandshakeTimeout,
		ResponseHeaderTimeout: p.config.ResponseHeaderTimeout,
		ExpectContinueTimeout: 1 * time.Second,
	}
	
	client = &http.Client{
		Transport: transport,
		Timeout:   utils.DefaultTimeout,
	}
	
	p.clients[endpoint] = client
	return client
}

// Close closes all HTTP clients in the pool
func (p *HTTPPool) Close() {
	p.mu.Lock()
	defer p.mu.Unlock()
	
	for _, client := range p.clients {
		if transport, ok := client.Transport.(*http.Transport); ok {
			transport.CloseIdleConnections()
		}
	}
	
	p.clients = make(map[string]*http.Client)
}

// Stats returns statistics about the connection pool
type PoolStats struct {
	TotalClients    int
	ActiveEndpoints []string
}

// GetStats returns current pool statistics
func (p *HTTPPool) GetStats() PoolStats {
	p.mu.RLock()
	defer p.mu.RUnlock()
	
	endpoints := make([]string, 0, len(p.clients))
	for endpoint := range p.clients {
		endpoints = append(endpoints, endpoint)
	}
	
	return PoolStats{
		TotalClients:    len(p.clients),
		ActiveEndpoints: endpoints,
	}
}

// WithTimeout returns a client with a specific timeout
func (p *HTTPPool) WithTimeout(endpoint string, timeout time.Duration) *http.Client {
	baseClient := p.GetClient(endpoint)
	
	// Create a new client with the specified timeout
	newClient := *baseClient
	newClient.Timeout = timeout
	
	return &newClient
}

// SetCustomHeaders sets custom headers for requests
type RoundTripperWithHeaders struct {
	base    http.RoundTripper
	headers map[string]string
}

func (r *RoundTripperWithHeaders) RoundTrip(req *http.Request) (*http.Response, error) {
	for key, value := range r.headers {
		req.Header.Set(key, value)
	}
	return r.base.RoundTrip(req)
}

// GetClientWithHeaders returns a client that automatically adds custom headers
func (p *HTTPPool) GetClientWithHeaders(endpoint string, headers map[string]string) *http.Client {
	baseClient := p.GetClient(endpoint)
	
	// Create a copy of the client with custom headers
	newClient := *baseClient
	newClient.Transport = &RoundTripperWithHeaders{
		base:    baseClient.Transport,
		headers: headers,
	}
	
	return &newClient
}

// GlobalPool is the default global HTTP pool instance
var GlobalPool = NewHTTPPool(nil)

// GetGlobalClient returns a client from the global pool
func GetGlobalClient(endpoint string) *http.Client {
	return GlobalPool.GetClient(endpoint)
}

// SetGlobalPoolConfig updates the global pool configuration
func SetGlobalPoolConfig(config *PoolConfig) {
	GlobalPool.Close()
	GlobalPool = NewHTTPPool(config)
}

// DoWithContext performs an HTTP request with context using the global pool
func DoWithContext(ctx context.Context, endpoint string, req *http.Request) (*http.Response, error) {
	client := GetGlobalClient(endpoint)
	return client.Do(req.WithContext(ctx))
}
