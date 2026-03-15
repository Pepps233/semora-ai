from fastapi import APIRouter, Request, HTTPException  # Request kept for future middleware use
from app.schemas.email import EmailRequest, EmailResponse
from app.schemas.resume import ParsedResume
from app.core.rate_limit import check_session_rate_limit
from app.core.config import settings
from app.core.supabase import get_supabase
from app.services.email_generator import generate_opening

router = APIRouter()


@router.post("/generate", response_model=EmailResponse)
async def generate_email(request: Request, body: EmailRequest):
    """Generate a personalized outreach email opening for a lab."""
    await check_session_rate_limit(body.session_id, "email", settings.DAILY_EMAIL_LIMIT)

    supabase = get_supabase()

    # Load parsed resume from session
    session_result = (
        supabase.table("sessions")
        .select("session_id, parsed_resume")
        .eq("session_id", body.session_id)
        .single()
        .execute()
    )
    if not session_result.data or session_result.data.get("parsed_resume") is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found or resume not yet parsed.",
        )

    parsed = ParsedResume(**session_result.data["parsed_resume"])

    # Fetch lab metadata from Supabase
    lab_result = (
        supabase.table("labs")
        .select("*")
        .eq("lab_id", body.lab_id)
        .single()
        .execute()
    )
    if not lab_result.data:
        raise HTTPException(status_code=404, detail="Lab not found.")

    lab_meta = lab_result.data

    response = await generate_opening(parsed, lab_meta, body.lab_id)

    # Log to email_logs
    supabase.table("email_logs").insert({
        "session_id": body.session_id,
        "lab_id": body.lab_id,
        "opening": response.opening,
    }).execute()

    return response
