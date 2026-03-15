"""GPT-4o personalized email opening generator."""
import json
from openai import AsyncOpenAI
from app.core.config import settings
from app.schemas.resume import ParsedResume
from app.schemas.email import EmailResponse
from app.services.prompts.email_opening import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_opening(
    parsed: ParsedResume, lab_meta: dict, lab_id: str
) -> EmailResponse:
    user_prompt = USER_PROMPT_TEMPLATE.format(
        name=parsed.name or "the student",
        skills=", ".join(parsed.skills[:8]),
        research=", ".join(parsed.research[:3]),
        projects=", ".join(parsed.projects[:2]),
        desired_roles=", ".join(parsed.desired_roles[:3]),
        professor=lab_meta.get("professor", ""),
        department=lab_meta.get("department", ""),
        research_areas=", ".join(lab_meta.get("research_areas", [])),
        description=lab_meta.get("description", ""),
        professor_about=lab_meta.get("professor_about", ""),
    )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content)
    return EmailResponse(
        lab_id=lab_id,
        opening=data["opening"],
        subject_line=data["subject_line"],
    )
