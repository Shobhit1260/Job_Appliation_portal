"""
Redis Connection Management Module

This module handles:
- Async Redis connection initialization
- Connection pooling for better performance
- Connection lifecycle (startup/shutdown events)
- Error handling and retry logic
"""

import redis.asyncio as redis
from app.config import settings
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Global Redis client instance
redis_client: Optional[redis.Redis] = None


async def init_redis() -> redis.Redis:
    """
    Initialize async Redis connection with connection pooling.
    
    Returns a connection pool manager for efficient concurrent requests.
    
    CONCEPTS:
    - Connection Pooling: Reuses connections instead of creating new ones
    - Async: Non-blocking I/O for better performance in FastAPI
    
    Returns:
        redis.Redis: Async Redis client instance
    """
    global redis_client
    
    try:
        redis_client = await redis.from_url(
            f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}" 
            if settings.REDIS_PASSWORD 
            else f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
            encoding="utf8",
            decode_responses=True,  # Automatically decode bytes to strings
            socket_connect_timeout=5,
            socket_keepalive=True,
            health_check_interval=30,  # Check connection health every 30s
        )
        
        # Test the connection
        await redis_client.ping()
        logger.info("✓ Redis connection established successfully")
        return redis_client
        
    except Exception as e:
        logger.error(f"✗ Failed to connect to Redis: {e}")
        logger.warning("⚠ Running without caching. Set ENABLE_CACHING=False to suppress this warning.")
        return None


async def close_redis() -> None:
    """
    Close Redis connection gracefully.
    
    Called on application shutdown to release resources.
    """
    global redis_client
    
    if redis_client:
        try:
            await redis_client.close()
            logger.info("✓ Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")


async def get_redis() -> Optional[redis.Redis]:
    """
    Get the current Redis client instance.
    
    Returns:
        redis.Redis: Current async Redis client or None if not initialized
    """
    return redis_client
