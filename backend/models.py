from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float,
    ForeignKey, Boolean, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum

from database import Base


class UserRole(str, enum.Enum):
    judge = "judge"
    lawyer = "lawyer"
    clerk = "clerk"


class CaseStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    adjourned = "adjourned"
    decided = "decided"
    disposed = "disposed"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.lawyer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("Case", back_populates="assigned_user")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(100), unique=True, index=True, nullable=False)
    court_name = Column(String(255), nullable=False)
    judge_name = Column(String(255), nullable=False)
    petitioner = Column(String(255), nullable=False)
    respondent = Column(String(255), nullable=False)
    status = Column(SAEnum(CaseStatus), nullable=False, default=CaseStatus.pending)
    filing_date = Column(DateTime, nullable=False)
    next_date = Column(DateTime, nullable=True)
    ipc_sections = Column(Text, nullable=True)  # comma-separated
    priority_score = Column(Float, default=0.0)
    priority = Column(SAEnum(Priority), default=Priority.medium)
    description = Column(Text, nullable=True)
    estimated_duration_minutes = Column(Integer, default=30)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assigned_user = relationship("User", back_populates="cases")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    hearings = relationship("Hearing", back_populates="case", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    ocr_text = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    pinecone_indexed = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    case = relationship("Case", back_populates="documents")


class Hearing(Base):
    __tablename__ = "hearings"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    scheduled_date = Column(DateTime, nullable=False)
    scheduled_time_slot = Column(String(50), nullable=True)
    duration_minutes = Column(Integer, default=30)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="scheduled")  # scheduled, completed, adjourned
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="hearings")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    alert_type = Column(String(100), nullable=False)  # deadline, hearing, urgent
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    deadline_date = Column(DateTime, nullable=True)
