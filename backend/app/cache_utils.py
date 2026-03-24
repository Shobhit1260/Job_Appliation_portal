"""
Caching Utilities Module

This module provides:
- Decorators for automatic route caching
- Cache key generation strategies
- Cache invalidation management
- TTL (Time To Live) handling
"""

import json
import hashlib
import inspect
from functools import wraps
from typing import Any, Callable, Optional
import logging
import orjson
from app.redis_client import get_redis
from app.config import settings
from fastapi import Request
from fastapi.encoders import jsonable_encoder

logger = logging.getLogger(__name__)


# ============================================================================
# CORE CONCEPTS - IMPORTANT!
# ============================================================================
# 1. CACHE HIT: When requested data exists in Redis (fast, from memory)
# 2. CACHE MISS: When data not in Redis (slow, queries database)
# 3. TTL (Time To Live): How long cached data stays valid (in seconds)
# 4. CACHE INVALIDATION: Deleting stale cache (hardest problem in CS!)
# ============================================================================


def generate_cache_key(
    prefix: str,
    user_id: Optional[str] = None,
    params: Optional[dict] = None
) -> str:
    """
    Generate a deterministic cache key.
    
    CONCEPT: Same parameters = same cache key = cache hit
    
    Args:
        prefix: Logical prefix (e.g., "applications:listall")
        user_id: User identifier for user-specific cache
        params: Query parameters that affect the result
    
    Returns:
        str: A unique cache key
    
    Example:
        generate_cache_key(
            prefix="applications:list",
            user_id="user-123",
            params={"status": "applied", "page": 1}
        )
        # Returns: "applications:list:user-123:abc123def456"
    """
    key_parts = [prefix]
    
    if user_id:
        key_parts.append(user_id)
    
    if params:
        # Sort params for consistent ordering
        params_str = json.dumps(params, sort_keys=True, default=str)
        # Hash params to keep key length reasonable
        params_hash = hashlib.md5(params_str.encode()).hexdigest()
        key_parts.append(params_hash)
    
    return ":".join(key_parts)


async def set_cache(
    key: str,
    value: Any,
    ttl: int = settings.CACHE_TTL_SECONDS
) -> bool:
    """
    Store data in Redis cache.
    
    CONCEPT: Use orjson for 3-10x faster JSON serialization than stdlib json
    
    Args:
        key: Cache key
        value: Data to cache (will be JSON serialized)
        ttl: Time to live in seconds (default: 1 hour)
    
    Returns:
        bool: True if successful, False otherwise
    """
    if not settings.ENABLE_CACHING:
        return False
    
    redis = await get_redis()
    if not redis:
        return False
    
    try:
        # orjson: Fast, compact JSON serialization
        serialized = orjson.dumps(jsonable_encoder(value)).decode()
        await redis.setex(key, ttl, serialized)
        logger.debug(f"✓ Cache SET: {key} (TTL: {ttl}s)")
        return True
    except Exception as e:
        logger.error(f"Cache SET failed for {key}: {e}")
        return False


async def get_cache(key: str) -> Optional[Any]:
    """
    Retrieve data from Redis cache.
    
    CONCEPT: Cache hit = fast response without database query
    
    Args:
        key: Cache key
    
    Returns:
        Any: Deserialized cached value or None (cache miss)
    """
    if not settings.ENABLE_CACHING:
        return None
    
    redis = await get_redis()
    if not redis:
        return None
    
    try:
        cached = await redis.get(key)
        if cached:
            logger.debug(f"✓ Cache HIT: {key}")
            return orjson.loads(cached)
        else:
            logger.debug(f"✗ Cache MISS: {key}")
            return None
    except Exception as e:
        logger.error(f"Cache GET failed for {key}: {e}")
        return None


async def invalidate_cache(pattern: str = None, key: str = None) -> int:
    """
    Delete cache entries.
    
    CONCEPT: Cache Invalidation - when to delete stale data
    Use patterns to invalidate related caches together.
    
    Strategies:
    1. By exact key: invalidate_cache(key="applications:list:user-123:abc123")
    2. By pattern: invalidate_cache(pattern="applications:list:user-123:*")
       (deletes all cached lists for that user)
    3. By prefix: invalidate_cache(pattern="applications:*")
       (deletes all application caches)
    
    Args:
        pattern: Glob pattern (e.g., "applications:*" matches all app caches)
        key: Exact key to delete
    
    Returns:
        int: Number of keys deleted
    """
    redis = await get_redis()
    if not redis or (not pattern and not key):
        return 0
    
    try:
        if key:
            deleted = await redis.delete(key)
            logger.debug(f"✓ Cache INVALIDATED: {key}")
        else:
            # Pattern-based deletion using SCAN (safe for large datasets)
            deleted = 0
            async for key_to_delete in redis.scan_iter(match=pattern):
                await redis.delete(key_to_delete)
                deleted += 1
            logger.debug(f"✓ Cache INVALIDATED: {deleted} keys matching '{pattern}'")
        
        return deleted
    except Exception as e:
        logger.error(f"Cache invalidation failed: {e}")
        return 0


def cache_endpoint(
    prefix: str,
    ttl: int = settings.CACHE_TTL_SECONDS,
    bypass_cache: bool = False,
):
    """
    Decorator for automatic endpoint caching with user-awareness.
    
    CONCEPT: Automatically cache GET request responses with TTL
    
    Features:
    - Automatically extracts user_id from token
    - Generates cache key from prefix + user_id + query params
    - On cache hit: Returns cached data instantly (10-100x faster)
    - On cache miss: Queries DB, caches result, returns to client
    - Supports TTL for automatic expiration
    
    Usage Example:
        @router.get("/getallApplication")
        @cache_endpoint(prefix="applications:list", ttl=1800)  # 30 min cache
        async def get_applications(...):
            # Your database query here
            return results
    
    Args:
        prefix: Logical cache prefix (e.g., "applications:list")
        ttl: Time to live in seconds (default: 1 hour)
        bypass_cache: If True, skip caching (useful for debugging)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Skip caching if disabled or requested
            if bypass_cache or not settings.ENABLE_CACHING:
                return await func(*args, **kwargs)
            
            # Extract user_id and query params from kwargs
            user_id = kwargs.get("current_user") or kwargs.get("user")
            
            # Build cache key
            params = {}
            for key in ["status", "portal", "search", "page", "page_size"]:
                if key in kwargs:
                    params[key] = kwargs[key]
            
            cache_key = generate_cache_key(prefix, user_id, params if params else None)
            
            # Try cache first (cache hit)
            cached_result = await get_cache(cache_key)
            if cached_result is not None:
                logger.info(f"🚀 Cache HIT - returning cached data (saved DB query)")
                return cached_result
            
            # Cache miss - query database
            logger.info(f"📝 Cache MISS - querying database")
            result = func(*args, **kwargs)
            if inspect.isawaitable(result):
                result = await result
            
            # Store in cache for next time
            await set_cache(cache_key, result, ttl)
            
            return result
        
        return wrapper
    
    return decorator
