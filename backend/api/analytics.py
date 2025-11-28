# backend/api/analytics.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, extract
from sqlalchemy.orm import Session, joinedload

from backend.db.session import get_db
from backend.db.models import Report, ServiceArea, Category, Severity, StatusUpdate, Assignment
from backend.schemas import reports,analytics as schemas

router = APIRouter(prefix="/analytics", tags=["analytics"])

# -----------
# READ: Hot Spots
# -----------

@router.get("/hotspots", response_model=List[schemas.HotSpots])
def list_hotspots(db: Session = Depends(get_db)):
    stmt = (
    select(
        Report.area_id,
        Report.category_id,
        func.count(Report.report_id).label("report_count")
    )
    .join(ServiceArea, Report.area_id == ServiceArea.area_id)
    .join(Category, Report.category_id == Category.category_id)
    .group_by(Report.area_id, Report.category_id)
    .order_by(Report.area_id, Report.category_id)
)
    areas = db.execute(stmt).mappings().all()
    return areas

# -----------
# READ: Average Resolution Times
# -----------

@router.get("/resolution-times", response_model=schemas.ResolutionTimes)
def avg_resolution_time(db: Session = Depends(get_db)):
    resolved_reports_cte = (
        select(
            Assignment.report_id,
            Assignment.accepted_at,
            func.max(StatusUpdate.changed_at).label("resolved_at")
        )
        .join(StatusUpdate, Assignment.report_id == StatusUpdate.report_id)
        .where(
            Assignment.is_active == False,
            StatusUpdate.status.in_(["RESOLVED", "CLOSED"]),
            Assignment.accepted_at.isnot(None)
        )
        .group_by(Assignment.report_id, Assignment.accepted_at)
        .cte("resolved_reports")
    )

    # Final query: average resolution in days
    stmt = select(
        func.avg(
            extract("epoch", resolved_reports_cte.c.resolved_at - resolved_reports_cte.c.accepted_at) / 86400
        ).label("avg_resolution_days")
    )

    result = db.execute(stmt).scalar()
    return {"avg_resolution_days": float(result) if result else 0.0}