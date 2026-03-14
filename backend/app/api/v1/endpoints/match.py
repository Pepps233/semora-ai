from fastapi import APIRouter, Request, HTTPException
from app.schemas.match import MatchRequest, MatchResponse, LabMatch
from app.schemas.resume import ParsedResume
from app.core.rate_limit import check_rate_limit
from app.core.config import settings
from app.core.supabase import get_supabase
from app.services.embeddings import query_similar_labs
from typing import List

router = APIRouter()

TOP_K = 10
RETURN_TOP = 5


@router.post("/", response_model=MatchResponse)
async def match_labs(request: Request, body: MatchRequest):
    """Return top ranked research lab matches for a parsed resume."""
    await check_rate_limit(request, "match", settings.DAILY_MATCH_LIMIT)

    supabase = get_supabase()
    result = (
        supabase.table("sessions")
        .select("session_id, parsed_resume")
        .eq("session_id", body.session_id)
        .single()
        .execute()
    )

    if not result.data or result.data.get("parsed_resume") is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found or resume not yet parsed.",
        )

    parsed = ParsedResume(
        session_id=body.session_id,
        **result.data["parsed_resume"],
    )

    # Override desired_roles if caller provides them
    if body.desired_roles:
        parsed.desired_roles = body.desired_roles

    candidates: List[LabMatch] = await query_similar_labs(parsed, top_k=TOP_K)

    # Boost labs whose research_areas overlap with desired_roles
    if parsed.desired_roles:
        role_keywords = {r.lower() for r in parsed.desired_roles}

        def boost_score(lab: LabMatch) -> float:
            overlap = sum(
                1 for area in lab.research_areas
                if any(kw in area.lower() for kw in role_keywords)
            )
            return lab.similarity_score + overlap * 0.05

        candidates.sort(key=boost_score, reverse=True)

    top = candidates[:RETURN_TOP]

    # Log to match_logs
    supabase.table("match_logs").insert({
        "session_id": body.session_id,
        "lab_ids": [lab.lab_id for lab in top],
    }).execute()

    return MatchResponse(session_id=body.session_id, matches=top)
