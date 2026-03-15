from fastapi import Request, HTTPException
from app.core.redis import get_redis
from app.core.config import settings
import time


async def check_rate_limit(request: Request, action: str, daily_limit: int) -> None:
    redis = await get_redis()
    ip = request.client.host
    today = time.strftime("%Y-%m-%d")
    key = f"rate:{action}:{ip}:{today}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 86400)  # TTL = 24h
    if count > daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily {action} limit of {daily_limit} reached. Try again tomorrow.",
        )


async def peek_rate_limit(request: Request, action: str, daily_limit: int) -> None:
    """Check rate limit without incrementing the counter.

    Used to gate upload before any resources are consumed.
    """
    redis = await get_redis()
    ip = request.client.host
    today = time.strftime("%Y-%m-%d")
    key = f"rate:{action}:{ip}:{today}"
    raw = await redis.get(key)
    count = int(raw) if raw is not None else 0
    if count >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily {action} limit of {daily_limit} reached. Try again tomorrow.",
        )
