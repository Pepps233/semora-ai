from fastapi import HTTPException
from app.core.redis import get_redis


async def check_session_rate_limit(session_id: str, action: str, limit: int) -> None:
    """Increment and enforce a per-session action limit.

    Key: rate:{action}:{session_id}
    No TTL — the limit is per session lifetime, not per day.
    """
    redis = await get_redis()
    key = f"rate:{action}:{session_id}"
    count = await redis.incr(key)
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail=f"Session {action} limit of {limit} reached.",
        )
