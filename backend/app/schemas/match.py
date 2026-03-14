from pydantic import BaseModel
from typing import List, Optional


class MatchRequest(BaseModel):
    session_id: str
    desired_roles: Optional[List[str]] = None


class LabMatch(BaseModel):
    lab_id: str
    professor: str
    department: str
    research_areas: List[str]
    similarity_score: float
    contact_email: Optional[str] = None
    description: Optional[str] = None
    professor_about: Optional[str] = None


class MatchResponse(BaseModel):
    session_id: str
    matches: List[LabMatch]
