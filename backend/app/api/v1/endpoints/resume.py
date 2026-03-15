from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Request, HTTPException
from app.schemas.resume import ResumeUploadResponse, ResumeStatusResponse, ParsedResume
from app.core.config import settings
from app.core.supabase import get_supabase
from app.services.pdf_parser import extract_text
import uuid

router = APIRouter()

MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a PDF resume. Stores the file, then parses and embeds in background."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()

    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 2 MB limit.")

    session_id = str(uuid.uuid4())
    storage_path = f"resumes/{session_id}.pdf"

    supabase = get_supabase()
    supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf"},
    )

    supabase.table("sessions").insert({"session_id": session_id, "parsed_resume": None}).execute()

    background_tasks.add_task(_parse_and_store, session_id, pdf_bytes)

    return ResumeUploadResponse(session_id=session_id, storage_path=storage_path)


@router.get("/{session_id}", response_model=ResumeStatusResponse)
async def get_resume_status(session_id: str):
    """Poll parsed resume status by session_id."""
    supabase = get_supabase()
    result = (
        supabase.table("sessions")
        .select("session_id, parsed_resume")
        .eq("session_id", session_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found.")

    parsed_resume = result.data.get("parsed_resume")
    if parsed_resume is None:
        return ResumeStatusResponse(session_id=session_id, status="pending")

    return ResumeStatusResponse(
        session_id=session_id,
        status="done",
        parsed=ParsedResume(**parsed_resume),
    )


async def _parse_and_store(session_id: str, pdf_bytes: bytes) -> None:
    """Background task: extract text, parse resume, store in sessions table, cache embedding."""
    from app.services.resume_parser import parse_resume
    from app.services.embeddings import embed_and_cache_resume

    raw_text = extract_text(pdf_bytes)
    parsed = await parse_resume(session_id, raw_text)

    supabase = get_supabase()
    supabase.table("sessions").update({"parsed_resume": parsed.model_dump()}).eq(
        "session_id", session_id
    ).execute()

    await embed_and_cache_resume(session_id, parsed)
