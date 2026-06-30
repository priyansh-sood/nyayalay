from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Case, User, CaseStatus
from schemas import CauseListEntry, CauseListResponse, Priority
from routers.auth import get_current_user

router = APIRouter(prefix="/cause-list", tags=["cause_list"])

# Court hours: 10:30 AM to 4:30 PM (360 minutes total, minus 1hr lunch = 300 min)
COURT_START_HOUR = 10
COURT_START_MINUTE = 30
COURT_END_HOUR = 16
COURT_END_MINUTE = 30
LUNCH_START_HOUR = 13
LUNCH_START_MINUTE = 0
LUNCH_DURATION_MINUTES = 60

PRIORITY_WEIGHTS = {
    Priority.urgent: 4,
    Priority.high: 3,
    Priority.medium: 2,
    Priority.low: 1,
}


def _minutes_to_time_str(base_hour: int, base_min: int, offset_minutes: int) -> str:
    total = base_hour * 60 + base_min + offset_minutes
    h = total // 60
    m = total % 60
    period = "AM" if h < 12 else "PM"
    display_h = h if h <= 12 else h - 12
    display_h = 12 if display_h == 0 else display_h
    return f"{display_h:02d}:{m:02d} {period}"


def _build_cause_list(cases: List[Case], target_date: date) -> CauseListResponse:
    # Sort by priority (urgent first), then priority_score descending, then filing_date
    def sort_key(c: Case):
        pw = PRIORITY_WEIGHTS.get(c.priority, 1)
        return (-pw, -c.priority_score, c.filing_date)

    sorted_cases = sorted(cases, key=sort_key)

    entries: List[CauseListEntry] = []
    current_offset = 0  # minutes from COURT_START
    slot_number = 1
    conflicts_detected = 0
    total_available_minutes = 300  # 5 hours minus lunch

    lunch_start_offset = LUNCH_START_HOUR * 60 + LUNCH_START_MINUTE - (COURT_START_HOUR * 60 + COURT_START_MINUTE)
    lunch_end_offset = lunch_start_offset + LUNCH_DURATION_MINUTES

    for case in sorted_cases:
        duration = case.estimated_duration_minutes or 30

        # Skip lunch break
        if current_offset < lunch_start_offset <= current_offset + duration:
            current_offset = lunch_end_offset
            conflicts_detected += 1

        if current_offset >= total_available_minutes + LUNCH_DURATION_MINUTES:
            # Court day full; schedule remaining as conflict
            conflicts_detected += 1
            continue

        time_slot = _minutes_to_time_str(COURT_START_HOUR, COURT_START_MINUTE, current_offset)

        entries.append(
            CauseListEntry(
                case_id=case.id,
                case_number=case.case_number,
                petitioner=case.petitioner,
                respondent=case.respondent,
                ipc_sections=case.ipc_sections,
                priority=case.priority,
                priority_score=case.priority_score,
                estimated_duration_minutes=duration,
                time_slot=time_slot,
                slot_number=slot_number,
                judge_name=case.judge_name,
                court_name=case.court_name,
                status=case.status,
            )
        )
        current_offset += duration
        slot_number += 1

    total_duration = sum(e.estimated_duration_minutes for e in entries)
    court_name = entries[0].court_name if entries else None

    return CauseListResponse(
        date=target_date.isoformat(),
        court_name=court_name,
        entries=entries,
        total_cases=len(entries),
        total_duration_minutes=total_duration,
        conflicts_detected=conflicts_detected,
    )


@router.get("", response_model=CauseListResponse)
def get_cause_list(
    target_date: Optional[str] = Query(None, description="ISO date string YYYY-MM-DD"),
    court_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if target_date:
        try:
            parsed_date = date.fromisoformat(target_date)
        except ValueError:
            parsed_date = date.today()
    else:
        parsed_date = date.today()

    # Get all active/pending cases with a next_date on this day
    start_dt = datetime.combine(parsed_date, datetime.min.time())
    end_dt = datetime.combine(parsed_date, datetime.max.time())

    query = db.query(Case).filter(
        Case.next_date >= start_dt,
        Case.next_date <= end_dt,
        Case.status.in_([CaseStatus.active, CaseStatus.pending, CaseStatus.adjourned]),
    )

    if court_name:
        query = query.filter(Case.court_name.ilike(f"%{court_name}%"))

    cases = query.all()

    # If no cases for today (e.g., dev/demo), return upcoming cases
    if not cases:
        cases = (
            db.query(Case)
            .filter(
                Case.status.in_([CaseStatus.active, CaseStatus.pending, CaseStatus.adjourned]),
            )
            .order_by(Case.next_date.asc())
            .limit(15)
            .all()
        )

    return _build_cause_list(cases, parsed_date)


@router.get("/week", response_model=List[CauseListResponse])
def get_week_cause_list(
    start_date: Optional[str] = Query(None),
    court_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if start_date:
        try:
            start = date.fromisoformat(start_date)
        except ValueError:
            start = date.today()
    else:
        start = date.today()

    week_lists = []
    for i in range(6):  # Mon–Sat
        target = start + timedelta(days=i)
        if target.weekday() == 6:  # Skip Sunday
            continue
        start_dt = datetime.combine(target, datetime.min.time())
        end_dt = datetime.combine(target, datetime.max.time())

        query = db.query(Case).filter(
            Case.next_date >= start_dt,
            Case.next_date <= end_dt,
            Case.status.in_([CaseStatus.active, CaseStatus.pending, CaseStatus.adjourned]),
        )
        if court_name:
            query = query.filter(Case.court_name.ilike(f"%{court_name}%"))

        cases = query.all()
        if cases:
            week_lists.append(_build_cause_list(cases, target))

    return week_lists
