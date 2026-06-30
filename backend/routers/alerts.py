from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Case, Alert, User, CaseStatus, Priority
from schemas import AlertOut
from routers.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])

DEADLINE_WARNING_DAYS = 7


def _generate_deadline_alerts(db: Session) -> List[Alert]:
    """Scan all active cases and create alerts for upcoming deadlines."""
    cutoff = datetime.utcnow() + timedelta(days=DEADLINE_WARNING_DAYS)
    now = datetime.utcnow()

    cases = (
        db.query(Case)
        .filter(
            Case.next_date <= cutoff,
            Case.next_date >= now,
            Case.status.in_([CaseStatus.active, CaseStatus.pending, CaseStatus.adjourned]),
        )
        .all()
    )

    new_alerts: List[Alert] = []
    for case in cases:
        days_left = (case.next_date - now).days

        # Check if alert already exists for this case + deadline
        existing = (
            db.query(Alert)
            .filter(
                Alert.case_id == case.id,
                Alert.alert_type == "deadline",
                Alert.deadline_date == case.next_date,
            )
            .first()
        )
        if existing:
            continue

        urgency = "URGENT" if days_left <= 2 else "WARNING"
        message = (
            f"{urgency}: Case {case.case_number} ({case.petitioner} vs {case.respondent}) "
            f"has a hearing in {days_left} day{'s' if days_left != 1 else ''} "
            f"on {case.next_date.strftime('%d %b %Y')} "
            f"at {case.court_name}."
        )

        alert = Alert(
            case_id=case.id,
            alert_type="deadline",
            message=message,
            deadline_date=case.next_date,
        )
        db.add(alert)
        new_alerts.append(alert)

    # Urgent priority cases
    urgent_cases = (
        db.query(Case)
        .filter(
            Case.priority == Priority.urgent,
            Case.status.in_([CaseStatus.active, CaseStatus.pending]),
        )
        .all()
    )
    for case in urgent_cases:
        existing = (
            db.query(Alert)
            .filter(Alert.case_id == case.id, Alert.alert_type == "urgent_priority")
            .first()
        )
        if existing:
            continue
        alert = Alert(
            case_id=case.id,
            alert_type="urgent_priority",
            message=(
                f"URGENT PRIORITY: Case {case.case_number} ({case.petitioner} vs {case.respondent}) "
                f"is marked as URGENT. IPC Sections: {case.ipc_sections or 'N/A'}. "
                f"Immediate attention required at {case.court_name}."
            ),
        )
        db.add(alert)
        new_alerts.append(alert)

    if new_alerts:
        db.commit()

    return new_alerts


def _enrich_alert(alert: Alert, db: Session) -> dict:
    case = db.query(Case).filter(Case.id == alert.case_id).first()
    return {
        "id": alert.id,
        "case_id": alert.case_id,
        "alert_type": alert.alert_type,
        "message": alert.message,
        "is_read": alert.is_read,
        "triggered_at": alert.triggered_at,
        "deadline_date": alert.deadline_date,
        "case_number": case.case_number if case else None,
        "petitioner": case.petitioner if case else None,
    }


@router.get("", response_model=List[AlertOut])
def get_alerts(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Generate fresh deadline alerts
    _generate_deadline_alerts(db)

    q = db.query(Alert)
    if unread_only:
        q = q.filter(Alert.is_read == False)  # noqa: E712

    alerts = q.order_by(Alert.triggered_at.desc()).limit(limit).all()
    return [AlertOut(**_enrich_alert(a, db)) for a in alerts]


@router.post("/{alert_id}/read", response_model=AlertOut)
def mark_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return AlertOut(**_enrich_alert(alert, db))


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Alert).filter(Alert.is_read == False).update({"is_read": True})  # noqa: E712
    db.commit()
    return {"message": "All alerts marked as read"}


@router.get("/count")
def alert_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _generate_deadline_alerts(db)
    unread = db.query(Alert).filter(Alert.is_read == False).count()  # noqa: E712
    return {"unread": unread}
