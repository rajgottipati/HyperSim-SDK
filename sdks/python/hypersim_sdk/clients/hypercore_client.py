"""
HyperCore client for cross-layer integration with AsyncIO.
"""

import asyncio
from typing import Dict, List, Any, Optional, Union
import aiohttp
import json
from ..types.network import Network, get_network_config
from ..types.simulation import (
    TransactionRequest, HyperCoreData, Position, MarketData, 
    MarketDepth, CoreInteraction
)
from ..types.errors import NetworkError, ValidationError
from ..utils.constants import HYPERCORE_ENDPOINTS, PRECOMPILE_ADDRESSES
from ..utils.validators import validate_ethereum_address


class HyperCoreClient:
    """Async client for HyperCore cross-layer interactions."""
    
    def __init__(
        self,
        network: Network,
        timeout: float = 30.0,
        enabled: bool = True,
        debug: bool = False
    ) -> None:
        """Initialize HyperCore client.
        
        Args:
            network: Target network
            timeout: Request timeout in seconds
            enabled: Whether cross-layer integration is enabled
            debug: Enable debug logging
        """
        self.network = network
        self.config = get_network_config(network)
        self.timeout = timeout
        self.enabled = enabled
        self.debug = debug
        
        # HyperCore API endpoints
        self.endpoints = HYPERCORE_ENDPOINTS[network]
        
        # HTTP session for API calls
        self._session: Optional[aiohttp.ClientSession] = None
        
        if self.debug:
            print(f"[HyperCore Client] Initialized for {network}, enabled: {enabled}")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _ensure_session(self) -> None:
        """Ensure HTTP session is created."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            connector = aiohttp.TCPConnector(limit=100, limit_per_host=30)
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers={"Content-Type": "application/json"}
            )
    
    async def close(self) -> None:
        """Close the client and cleanup resources."""
        if self._session and not self._session.closed:
            await self._session.close()
        
        if self.debug:
            print("[HyperCore Client] Closed")
    
    async def get_relevant_data(self, transaction: TransactionRequest) -> Optional[HyperCoreData]:
        """Get relevant HyperCore data for a transaction.
        
        Args:
            transaction: Transaction to analyze
            
        Returns:
            Optional[HyperCoreData]: Relevant HyperCore data or None
        """
        if not self.enabled:
            return None
        
        try:
            await self._ensure_session()
            
            # Fetch user positions if transaction involves a user address
            positions = await self._get_user_positions(transaction.from_address)
            
            # Fetch market data for relevant assets
            market_data = await self._get_market_data()
            
            # Analyze cross-layer interactions
            interactions = self._analyze_cross_layer_interactions(transaction)
            
            # Get core state information
            core_state = await self._get_core_state()
            
            if self.debug:
                print(f"[HyperCore Client] Retrieved data: {len(positions or [])} positions")
            
            return HyperCoreData(
                core_state=core_state,
                positions=positions,
                market_data=market_data,
                interactions=interactions
            )
        
        except Exception as error:
            if self.debug:
                print(f"[HyperCore Client] Failed to get relevant data: {error}")
            # Return None instead of raising to not break simulation
            return None
    
    async def get_user_info(self, user_address: str) -> Dict[str, Any]:
        """Get user information from HyperCore.
        
        Args:
            user_address: User address to query
            
        Returns:
            Dict containing user info
            
        Raises:
            ValidationError: If address is invalid
            NetworkError: If API request fails
        """
        validate_ethereum_address(user_address, "user_address")
        
        await self._ensure_session()
        
        try:
            response = await self._make_request("POST", self.endpoints["info"], {
                "type": "clearinghouseState",
                "user": user_address
            })
            
            return response
        
        except Exception as error:
            raise NetworkError(f"Failed to get user info: {error}")
    
    async def get_market_info(self) -> Dict[str, Any]:
        """Get market information from HyperCore.
        
        Returns:
            Dict containing market info
        """
        await self._ensure_session()
        
        try:
            response = await self._make_request("POST", self.endpoints["info"], {
                "type": "meta"
            })
            
            return response
        
        except Exception as error:
            raise NetworkError(f"Failed to get market info: {error}")
    
    async def get_all_mids(self) -> Dict[str, str]:
        """Get all asset mid prices.
        
        Returns:
            Dict mapping asset names to mid prices
        """
        await self._ensure_session()
        
        try:
            response = await self._make_request("POST", self.endpoints["info"], {
                "type": "allMids"
            })
            
            return response
        
        except Exception as error:
            raise NetworkError(f"Failed to get mid prices: {error}")
    
    async def get_l2_book(self, coin: str) -> Dict[str, Any]:
        """Get L2 order book for an asset.
        
        Args:
            coin: Asset symbol
            
        Returns:
            Dict containing L2 book data
        """
        await self._ensure_session()
        
        try:
            response = await self._make_request("POST", self.endpoints["info"], {
                "type": "l2Book",
                "coin": coin
            })
            
            return response
        
        except Exception as error:
            raise NetworkError(f"Failed to get L2 book: {error}")
    
    async def _get_user_positions(self, user_address: str) -> Optional[List[Position]]:
        """Get user positions from HyperCore."""
        try:
            user_info = await self.get_user_info(user_address)
            
            positions = []
            if "assetPositions" in user_info:
                for pos_data in user_info["assetPositions"]:
                    if pos_data["position"]["szi"] != "0":
                        position = Position(
                            asset=str(pos_data["position"].get("coin", "unknown")),
                            size=pos_data["position"]["szi"],
                            entry_price=pos_data["position"].get("entryPx", "0"),
                            unrealized_pnl=pos_data["position"].get("unrealizedPnl", "0"),
                            side="LONG" if float(pos_data["position"]["szi"]) > 0 else "SHORT"
                        )
                        positions.append(position)
            
            return positions if positions else None
        
        except Exception:
            return None
    
    async def _get_market_data(self) -> Optional[MarketData]:
        """Get market data from HyperCore."""
        try:
            # Get mid prices
            mids = await self.get_all_mids()
            
            # Get market meta info for depth data
            market_info = await self.get_market_info()
            
            depths = {}
            if "universe" in market_info:
                for asset_info in market_info["universe"]:
                    asset_name = asset_info["name"]
                    
                    # Get L2 book for depth info
                    try:
                        l2_book = await self.get_l2_book(asset_name)
                        
                        if "levels" in l2_book and len(l2_book["levels"]) >= 2:
                            bids = l2_book["levels"][0]
                            asks = l2_book["levels"][1]
                            
                            if bids and asks:
                                depths[asset_name] = MarketDepth(
                                    bid=bids[0]["px"] if bids[0] else "0",
                                    ask=asks[0]["px"] if asks[0] else "0",
                                    bid_size=bids[0]["sz"] if bids[0] else "0",
                                    ask_size=asks[0]["sz"] if asks[0] else "0"
                                )
                    except Exception:
                        continue
            
            return MarketData(
                prices=mids,
                depths=depths,
                funding_rates={}  # Could be enhanced to fetch funding rates
            )
        
        except Exception:
            return None
    
    async def _get_core_state(self) -> Dict[str, Any]:
        """Get HyperCore state information."""
        try:
            market_info = await self.get_market_info()
            return {
                "market_info": market_info,
                "timestamp": asyncio.get_event_loop().time()
            }
        except Exception:
            return {"timestamp": asyncio.get_event_loop().time()}
    
    def _analyze_cross_layer_interactions(self, transaction: TransactionRequest) -> List[CoreInteraction]:
        """Analyze potential cross-layer interactions."""
        interactions = []
        
        # Check if transaction interacts with precompiles
        if transaction.to in PRECOMPILE_ADDRESSES.values():
            interaction_type = "read" if transaction.data == "0x" else "write"
            
            interactions.append(CoreInteraction(
                interaction_type=interaction_type,
                precompile=transaction.to,
                data=transaction.data or "0x",
                result=None  # Will be filled during simulation
            ))
        
        # Check if transaction data contains precompile interactions
        if transaction.data and len(transaction.data) > 10:
            # Look for precompile addresses in calldata
            for name, address in PRECOMPILE_ADDRESSES.items():
                if address.lower().replace("0x", "") in transaction.data.lower():
                    interactions.append(CoreInteraction(
                        interaction_type="read",
                        precompile=address,
                        data=transaction.data,
                        result=None
                    ))
        
        return interactions
    
    async def _make_request(
        self,
        method: str,
        url: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to HyperCore API.
        
        Args:
            method: HTTP method
            url: Request URL
            data: Request data
            
        Returns:
            Dict containing response data
            
        Raises:
            NetworkError: If request fails
        """
        if not self._session:
            raise NetworkError("Session not initialized")
        
        try:
            if method.upper() == "POST":
                async with self._session.post(url, json=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise NetworkError(f"HTTP {response.status}: {error_text}")
                    
                    result = await response.json()
                    return result
            
            else:
                async with self._session.get(url, params=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise NetworkError(f"HTTP {response.status}: {error_text}")
                    
                    result = await response.json()
                    return result
        
        except aiohttp.ClientError as e:
            raise NetworkError(f"Request failed: {e}")
        except json.JSONDecodeError as e:
            raise NetworkError(f"Invalid JSON response: {e}")
    
    def is_enabled(self) -> bool:
        """Check if cross-layer integration is enabled."""
        return self.enabled
    
    def get_endpoints(self) -> Dict[str, str]:
        """Get API endpoints."""
        return self.endpoints.copy()
