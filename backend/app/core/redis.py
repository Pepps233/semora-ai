"""Upstash Redis REST client wrapper providing incr and expire commands."""
import httpx
from app.core.config import settings


class UpstashRedis:
    def __init__(self, url: str, token: str):
        self._url = url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {token}"}

    async def _cmd(self, *args):
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self._url,
                json=list(args),
                headers=self._headers,
                timeout=5,
            )
            resp.raise_for_status()
            return resp.json().get("result")

    async def incr(self, key: str) -> int:
        return int(await self._cmd("INCR", key))

    async def expire(self, key: str, seconds: int) -> int:
        return int(await self._cmd("EXPIRE", key, seconds))

    async def get(self, key: str):
        return await self._cmd("GET", key)

    async def set(self, key: str, value: str, ex: int | None = None):
        if ex is not None:
            return await self._cmd("SET", key, value, "EX", ex)
        return await self._cmd("SET", key, value)


_client: UpstashRedis | None = None


async def get_redis() -> UpstashRedis:
    global _client
    if _client is None:
        _client = UpstashRedis(
            url=settings.UPSTASH_REDIS_REST_URL,
            token=settings.UPSTASH_REDIS_REST_TOKEN,
        )
    return _client
