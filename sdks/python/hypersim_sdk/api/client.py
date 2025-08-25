"""
Asynchronous API client for HTTP requests using httpx.
"""

import asyncio
import json
import logging
from typing import Any, Dict, Optional, List, Union
from urllib.parse import urljoin, urlparse
import httpx
from pydantic import ValidationError as PydanticValidationError

from ..types.common import RequestOptions, Response, ErrorContext, RetryConfig
from ..exceptions import (
    NetworkError, APIError, TimeoutError, ValidationError,
    RateLimitError, AuthenticationError
)


logger = logging.getLogger(__name__)


class HTTPClient:
    """Asynchronous HTTP client with retry logic, rate limiting, and error handling."""
    
    def __init__(
        self,
        base_url: str,
        timeout: float = 30.0,
        retry_config: Optional[RetryConfig] = None,
        headers: Optional[Dict[str, str]] = None,
        **kwargs
    ):
        """Initialize HTTP client.
        
        Args:
            base_url: Base URL for API requests
            timeout: Request timeout in seconds
            retry_config: Retry configuration
            headers: Default headers for requests
            **kwargs: Additional httpx client arguments
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.retry_config = retry_config or RetryConfig(
            maxAttempts=3,
            baseDelay=1000,
            maxDelay=30000,
            backoffMultiplier=2.0,
            jitter=True
        )
        
        # Default headers
        default_headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'HyperSim-Python-SDK/1.0.0',
            'Accept': 'application/json',
        }
        if headers:
            default_headers.update(headers)
            
        # HTTP client configuration
        client_config = {
            'timeout': httpx.Timeout(timeout),
            'headers': default_headers,
            'follow_redirects': True,
            **kwargs
        }
        
        self._client: Optional[httpx.AsyncClient] = None
        self._client_config = client_config
        
    async def __aenter__(self) -> 'HTTPClient':
        """Async context manager entry."""
        await self._ensure_client()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
        
    async def _ensure_client(self) -> httpx.AsyncClient:
        """Ensure HTTP client is initialized."""
        if self._client is None:
            self._client = httpx.AsyncClient(**self._client_config)
        return self._client
        
    async def close(self):
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
            
    def _build_url(self, endpoint: str) -> str:
        """Build full URL from endpoint."""
        if endpoint.startswith(('http://', 'https://')):
            return endpoint
        return urljoin(f"{self.base_url}/", endpoint.lstrip('/'))
        
    def _handle_response_status(
        self, 
        response: httpx.Response,
        context: ErrorContext
    ) -> None:
        """Handle HTTP response status codes."""
        if response.status_code == 429:
            retry_after = response.headers.get('Retry-After', '60')
            raise RateLimitError(
                f"Rate limit exceeded. Retry after {retry_after} seconds",
                int(retry_after),
                context
            )
        elif response.status_code == 401:
            raise AuthenticationError("Authentication failed", context)
        elif response.status_code == 403:
            raise AuthenticationError("Access forbidden", context)
        elif response.status_code >= 400:
            try:
                error_data = response.json()
                message = error_data.get('message', f"HTTP {response.status_code}")
            except:
                message = f"HTTP {response.status_code}: {response.reason_phrase}"
                
            raise APIError(
                message,
                response.status_code,
                context,
                response.text
            )
            
    async def _make_request_with_retry(
        self,
        method: str,
        endpoint: str,
        options: RequestOptions,
        context: ErrorContext
    ) -> httpx.Response:
        """Make HTTP request with retry logic."""
        client = await self._ensure_client()
        url = self._build_url(endpoint)
        
        # Prepare request parameters
        request_params = {
            'method': method.upper(),
            'url': url,
            'timeout': options.timeout or self.timeout,
        }
        
        # Add headers
        if options.headers:
            headers = dict(client.headers)
            headers.update(options.headers)
            request_params['headers'] = headers
            
        # Add body/data
        if options.body is not None:
            if isinstance(options.body, (dict, list)):
                request_params['json'] = options.body
            else:
                request_params['content'] = options.body
                
        max_attempts = options.retries or self.retry_config.max_attempts
        base_delay = self.retry_config.base_delay / 1000.0  # Convert to seconds
        max_delay = self.retry_config.max_delay / 1000.0
        
        last_exception: Optional[Exception] = None
        
        for attempt in range(1, max_attempts + 1):
            try:
                context.retry_attempt = attempt
                logger.debug(f"Making {method} request to {url} (attempt {attempt})")
                
                response = await client.request(**request_params)
                self._handle_response_status(response, context)
                
                logger.debug(f"Request successful: {response.status_code}")
                return response
                
            except httpx.TimeoutException as e:
                last_exception = TimeoutError(
                    f"Request timeout after {request_params['timeout']}s",
                    context
                )
                logger.warning(f"Request timeout (attempt {attempt}): {e}")
                
            except httpx.ConnectError as e:
                last_exception = NetworkError(
                    f"Connection failed: {e}",
                    context
                )
                logger.warning(f"Connection error (attempt {attempt}): {e}")
                
            except httpx.HTTPError as e:
                last_exception = NetworkError(
                    f"HTTP error: {e}",
                    context
                )
                logger.warning(f"HTTP error (attempt {attempt}): {e}")
                
            except (RateLimitError, AuthenticationError, APIError) as e:
                # Don't retry on client errors (except rate limiting)
                if isinstance(e, RateLimitError):
                    if attempt < max_attempts:
                        await asyncio.sleep(e.retry_after)
                        continue
                raise e
                
            except Exception as e:
                last_exception = APIError(
                    f"Unexpected error: {e}",
                    500,
                    context
                )
                logger.error(f"Unexpected error (attempt {attempt}): {e}")
                
            # Calculate delay for next retry
            if attempt < max_attempts:
                delay = min(
                    base_delay * (self.retry_config.backoff_multiplier ** (attempt - 1)),
                    max_delay
                )
                
                if self.retry_config.jitter:
                    import random
                    delay *= (0.5 + random.random() * 0.5)
                    
                logger.debug(f"Retrying in {delay:.2f}s")
                await asyncio.sleep(delay)
                
        # All retries exhausted
        if last_exception:
            raise last_exception
        else:
            raise APIError("Request failed after all retries", 500, context)
            
    async def request(
        self,
        method: str,
        endpoint: str,
        options: Optional[RequestOptions] = None
    ) -> Response[Any]:
        """Make HTTP request.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            options: Request options
            
        Returns:
            Response object
        """
        options = options or RequestOptions()
        
        context = ErrorContext(
            operation=f"{method.upper()} {endpoint}",
            timestamp=int(asyncio.get_event_loop().time() * 1000),
        )
        
        try:
            response = await self._make_request_with_retry(method, endpoint, options, context)
            
            # Parse response data
            try:
                if response.headers.get('content-type', '').startswith('application/json'):
                    data = response.json()
                else:
                    data = response.text
            except Exception as e:
                logger.warning(f"Failed to parse response: {e}")
                data = response.text
                
            return Response(
                data=data,
                status=response.status_code,
                headers=dict(response.headers),
                success=True
            )
            
        except Exception as e:
            logger.error(f"Request failed: {e}")
            raise
            
    async def get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        options: Optional[RequestOptions] = None
    ) -> Response[Any]:
        """Make GET request.
        
        Args:
            endpoint: API endpoint
            params: Query parameters
            options: Request options
            
        Returns:
            Response object
        """
        options = options or RequestOptions()
        
        if params:
            # Add query parameters to URL
            import urllib.parse
            query_string = urllib.parse.urlencode(params)
            separator = '&' if '?' in endpoint else '?'
            endpoint = f"{endpoint}{separator}{query_string}"
            
        return await self.request('GET', endpoint, options)
        
    async def post(
        self,
        endpoint: str,
        data: Optional[Any] = None,
        options: Optional[RequestOptions] = None
    ) -> Response[Any]:
        """Make POST request.
        
        Args:
            endpoint: API endpoint
            data: Request body data
            options: Request options
            
        Returns:
            Response object
        """
        options = options or RequestOptions()
        if data is not None:
            options.body = data
            
        return await self.request('POST', endpoint, options)
        
    async def put(
        self,
        endpoint: str,
        data: Optional[Any] = None,
        options: Optional[RequestOptions] = None
    ) -> Response[Any]:
        """Make PUT request."""
        options = options or RequestOptions()
        if data is not None:
            options.body = data
            
        return await self.request('PUT', endpoint, options)
        
    async def delete(
        self,
        endpoint: str,
        options: Optional[RequestOptions] = None
    ) -> Response[Any]:
        """Make DELETE request."""
        return await self.request('DELETE', endpoint, options)
        
    async def patch(
        self,
        endpoint: str,
        data: Optional[Any] = None,
        options: Optional[RequestOptions] = None
    ) -> Response[Any]:
        """Make PATCH request."""
        options = options or RequestOptions()
        if data is not None:
            options.body = data
            
        return await self.request('PATCH', endpoint, options)


class JSONRPCClient(HTTPClient):
    """JSON-RPC client built on top of HTTPClient."""
    
    def __init__(self, rpc_url: str, **kwargs):
        """Initialize JSON-RPC client.
        
        Args:
            rpc_url: JSON-RPC endpoint URL
            **kwargs: Additional HTTPClient arguments
        """
        super().__init__(rpc_url, **kwargs)
        self._request_id = 1
        
    async def call(
        self,
        method: str,
        params: Optional[List[Any]] = None,
        timeout: Optional[float] = None,
        request_id: Optional[Union[str, int]] = None
    ) -> Any:
        """Make JSON-RPC call.
        
        Args:
            method: RPC method name
            params: Method parameters
            timeout: Request timeout
            request_id: Request ID (auto-generated if None)
            
        Returns:
            RPC result
        """
        if request_id is None:
            request_id = self._request_id
            self._request_id += 1
            
        rpc_request = {
            'jsonrpc': '2.0',
            'id': request_id,
            'method': method,
            'params': params or []
        }
        
        options = RequestOptions(
            body=rpc_request,
            timeout=timeout
        )
        
        context = ErrorContext(
            operation=f"RPC {method}",
            timestamp=int(asyncio.get_event_loop().time() * 1000),
            metadata={'method': method, 'params': params}
        )
        
        try:
            response = await self._make_request_with_retry('POST', '', options, context)
            rpc_response = response.json()
            
            if 'error' in rpc_response:
                error = rpc_response['error']
                raise APIError(
                    f"RPC error: {error.get('message', 'Unknown error')}",
                    error.get('code', -1),
                    context,
                    error.get('data')
                )
                
            return rpc_response.get('result')
            
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"RPC call failed: {e}", 500, context)
            
    async def batch(
        self,
        calls: List[Dict[str, Any]],
        timeout: Optional[float] = None
    ) -> List[Any]:
        """Make batch JSON-RPC calls.
        
        Args:
            calls: List of RPC call dictionaries with 'method' and optional 'params'
            timeout: Request timeout
            
        Returns:
            List of RPC results
        """
        batch_requests = []
        
        for call in calls:
            batch_requests.append({
                'jsonrpc': '2.0',
                'id': self._request_id,
                'method': call['method'],
                'params': call.get('params', [])
            })
            self._request_id += 1
            
        options = RequestOptions(
            body=batch_requests,
            timeout=timeout
        )
        
        context = ErrorContext(
            operation=f"RPC batch ({len(calls)} calls)",
            timestamp=int(asyncio.get_event_loop().time() * 1000),
            metadata={'batch_size': len(calls)}
        )
        
        try:
            response = await self._make_request_with_retry('POST', '', options, context)
            batch_response = response.json()
            
            if not isinstance(batch_response, list):
                batch_response = [batch_response]
                
            results = []
            for rpc_response in batch_response:
                if 'error' in rpc_response:
                    error = rpc_response['error']
                    results.append(APIError(
                        f"RPC error: {error.get('message', 'Unknown error')}",
                        error.get('code', -1),
                        context,
                        error.get('data')
                    ))
                else:
                    results.append(rpc_response.get('result'))
                    
            return results
            
        except Exception as e:
            raise APIError(f"RPC batch call failed: {e}", 500, context)
