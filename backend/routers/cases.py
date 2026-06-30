from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Case, User
from schemas import CaseCreate, CaseUpdate, CaseOut, CaseListResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["cases"])


def enrich_case(case: Case) -> dict:
    data = {
        "id": case.id,
        "case_number": case.case_number,
        "court_name": case.court_name,
        "judge_name": case.judge_name,
        "petitioner": case.petitioner,
        "respondent": case.respondent,
        "status": case.status,
        "filing_date": case.filing_date,
        "next_date": case.next_date,
        "ipc_sections": case.ipc_sections,
        "priority_score": case.priority_score,
        "priority": case.priority,
        "description": case.description,
        "estimated_duration_minutes": case.estimated_duration_minutes,
        "assigned_user_id": case.assigned_user_id,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "days_until_next": None,
        "is_urgent": False,
    }
    if case.next_date:
        now = datetime.utcnow()
        delta = (case.next_date.replace(tzinfo=None) - now).days
        data["days_until_next"] = delta
        data["is_urgent"] = delta <= 7
    return data


@router.get("", response_model=CaseListResponse)
def list_cases(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    upcoming_days: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Case)

    if status:
        q = q.filter(Case.status == status)
    if priority:
        q = q.filter(Case.priority == priority)
    if search:
        term = f"%{search}%"
        q = q.filter(
            (Case.case_number.ilike(term))
            | (Case.petitioner.ilike(term))
            | (Case.respondent.ilike(term))
            | (Case.ipc_sections.ilike(term))
        )
    if upcoming_days is not None:
        from datetime import timedelta
        cutoff = datetime.utcnow() + timedelta(days=upcoming_days)
        q = q.filter(Case.next_date <= cutoff, Case.next_date >= datetime.utcnow())

    total = q.count()
    items = (
        q.order_by(Case.next_date.asc().nullslast(), Case.priority_score.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return CaseListResponse(
        items=[CaseOut(**enrich_case(c)) for c in items],
        total=total,
        page=page,
        size=size,
    )


@router.post("", response_model=CaseOut, status_code=201)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Case).filter(Case.case_number == payload.case_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Case number already exists")

    case = Case(**payload.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return CaseOut(**enrich_case(case))


@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseOut(**enrich_case(case))


@router.put("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: int,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, field, value)
    case.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(case)
    return CaseOut(**enrich_case(case))


@router.delete("/{case_id}", status_code=204)
def delete_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(case)
    db.commit()


@router.get("/{case_id}/documents")
def get_case_documents(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    from schemas import DocumentOut
    return [DocumentOut.model_validate(d) for d in case.documents]


@router.get("/stats/summary")
def case_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import timedelta
    from sqlalchemy import func
    from models import CaseStatus

    total = db.query(func.count(Case.id)).scalar()
    active = db.query(func.count(Case.id)).filter(Case.status == CaseStatus.active).scalar()
    pending = db.query(func.count(Case.id)).filter(Case.status == CaseStatus.pending).scalar()
    decided = db.query(func.count(Case.id)).filter(Case.status == CaseStatus.decided).scalar()

    cutoff = datetime.utcnow() + timedelta(days=7)
    upcoming_7d = (
        db.query(func.count(Case.id))
        .filter(Case.next_date <= cutoff, Case.next_date >= datetime.utcnow())
        .scalar()
    )

    return {
        "total": total,
        "active": active,
        "pending": pending,
        "decided": decided,
        "upcoming_7_days": upcoming_7d,
    }
