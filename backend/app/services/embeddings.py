"""OpenAI embeddings + Pinecone vector search."""
import json
from openai import AsyncOpenAI
from pinecone import Pinecone
from app.core.config import settings
from app.core.redis import get_redis
from app.schemas.resume import ParsedResume
from app.schemas.match import LabMatch
from typing import List

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
pc = Pinecone(api_key=settings.PINECONE_API_KEY)

EMBEDDING_TTL = 86400  # 24 hours


async def embed_text(text: str) -> List[float]:
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        dimensions=512,
    )
    return response.data[0].embedding


def resume_to_query_text(parsed: ParsedResume) -> str:
    parts = [
        "Skills: " + ", ".join(parsed.skills),
        "Coursework: " + ", ".join(parsed.coursework),
        "Research: " + ", ".join(parsed.research),
        "Projects: " + ", ".join(parsed.projects),
        "Desired roles: " + ", ".join(parsed.desired_roles),
    ]
    if parsed.summary:
        parts.insert(0, parsed.summary)
    return "\n".join(parts)


async def embed_and_cache_resume(session_id: str, parsed: ParsedResume) -> List[float]:
    """Generate embedding for a parsed resume and cache it in Redis."""
    query_text = resume_to_query_text(parsed)
    embedding = await embed_text(query_text)
    redis = await get_redis()
    await redis.set(
        f"embedding:{session_id}",
        json.dumps(embedding),
        ex=EMBEDDING_TTL,
    )
    return embedding


async def get_cached_embedding(session_id: str) -> List[float] | None:
    """Retrieve a cached embedding from Redis, or None if expired/missing."""
    redis = await get_redis()
    value = await redis.get(f"embedding:{session_id}")
    if value is None:
        return None
    return json.loads(value)


async def query_similar_labs(
    parsed: ParsedResume, top_k: int = 10
) -> List[LabMatch]:
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    embedding = await get_cached_embedding(parsed.session_id)
    if embedding is None:
        embedding = await embed_and_cache_resume(parsed.session_id, parsed)
    results = index.query(vector=embedding, top_k=top_k, include_metadata=True)
    matches = []
    for match in results.matches:
        meta = match.metadata or {}
        matches.append(
            LabMatch(
                lab_id=match.id,
                professor=meta.get("professor", ""),
                department=meta.get("department", ""),
                research_areas=meta.get("research_areas", []),
                similarity_score=round(match.score, 4),
                contact_email=meta.get("contact_email"),
                description=meta.get("description"),
                professor_about=meta.get("professor_about"),
            )
        )
    return matches
