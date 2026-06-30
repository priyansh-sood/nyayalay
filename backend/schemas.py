from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from models import UserRole, CaseStatus, Priority


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.lawyer


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class TokenData(BaseModel):
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Case ──────────────────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    case_number: str
    court_name: str
    judge_name: str
    petitioner: str
    respondent: str
    status: CaseStatus = CaseStatus.pending
    filing_date: datetime
    next_date: Optional[datetime] = None
    ipc_sections: Optional[str] = None
    priority_score: float = 0.0
    priority: Priority = Priority.medium
    description: Optional[str] = None
    estimated_duration_minutes: int = 30
    assigned_user_id: Optional[int] = None


class CaseUpdate(BaseModel):
    court_name: Optional[str] = None
    judge_name: Optional[str] = None
    petitioner: Optional[str] = None
    respondent: Optional[str] = None
    status: Optional[CaseStatus] = None
    next_date: Optional[datetime] = None
    ipc_sections: Optional[str] = None
    priority_score: Optional[float] = None
    priority: Optional[Priority] = None
    description: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    assigned_user_id: Optional[int] = None


class CaseOut(BaseModel):
    id: int
    case_number: str
    court_name: str
    judge_name: str
    petitioner: str
    respondent: str
    status: CaseStatus
    filing_date: datetime
    next_date: Optional[datetime] = None
    ipc_sections: Optional[str] = None
    priority_score: float
    priority: Priority
    description: Optional[str] = None
    estimated_duration_minutes: int
    assigned_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    days_until_next: Optional[int] = None
    is_urgent: bool = False

    class Config:
        from_attributes = True


class CaseListResponse(BaseModel):
    items: List[CaseOut]
    total: int
    page: int
    size: int


# ── Document ──────────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: int
    case_id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    ocr_text: Optional[str] = None
    ai_summary: Optional[str] = None
    pinecone_indexed: bool
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ── Research ──────────────────────────────────────────────────────────────────

class ResearchQuery(BaseModel):
    query: str
    case_id: Optional[int] = None
    top_k: int = 5


class ResearchResult(BaseModel):
    answer: str
    sources: List[dict]
    query: str


# ── Cause List ────────────────────────────────────────────────────────────────

class CauseListEntry(BaseModel):
    case_id: int
    case_number: str
    petitioner: str
    respondent: str
    ipc_sections: Optional[str] = None
    priority: Priority
    priority_score: float
    estimated_duration_minutes: int
    time_slot: str
    slot_number: int
    judge_name: str
    court_name: str
    status: CaseStatus


class CauseListResponse(BaseModel):
    date: str
    court_name: Optional[str] = None
    entries: List[CauseListEntry]
    total_cases: int
    total_duration_minutes: int
    conflicts_detected: int


# ── Alert ─────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    case_id: int
    alert_type: str
    message: str
    is_read: bool
    triggered_at: datetime
    deadline_date: Optional[datetime] = None
    case_number: Optional[str] = None
    petitioner: Optional[str] = None

    class Config:
        from_attributes = True


# ── Hearing ───────────────────────────────────────────────────────────────────

class HearingOut(BaseModel):
    id: int
    case_id: int
    scheduled_date: datetime
    scheduled_time_slot: Optional[str] = None
    duration_minutes: int
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
