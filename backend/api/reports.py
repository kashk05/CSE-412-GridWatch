# backend/api/reports.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, text
from sqlalchemy.orm import Session, joinedload

from backend.db.session import get_db
from backend.db.models import Report, ServiceArea, Category, Severity, StatusUpdate
from backend.schemas import reports as schemas

router = APIRouter(prefix="/reports", tags=["reports"])


# -----------
# READ: list
# -----------

@router.get("/", response_model=List[schemas.ReportSummary])
def list_reports(
    search: Optional[str] = Query(None, description="Search by title substring"),
    area_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    stmt = (
        select(Report, ServiceArea, Category, Severity)
        .join(ServiceArea, Report.area_id == ServiceArea.area_id)
        .join(Category, Report.category_id == Category.category_id)
        .join(Severity, Report.severity_id == Severity.severity_id)
    )

    conditions = []
    if search:
        conditions.append(Report.title.ilike(f"%{search}%"))
    if area_id:
        conditions.append(Report.area_id == area_id)
    if category_id:
        conditions.append(Report.category_id == category_id)
    if status_filter:
        conditions.append(Report.current_status == status_filter)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.order_by(Report.created_at.desc())

    rows = db.execute(stmt).all()

    summaries: List[schemas.ReportSummary] = []
    for report, area, category, severity in rows:
        summaries.append(
            schemas.ReportSummary(
                report_id=report.report_id,
                title=report.title,
                current_status=report.current_status,
                created_at=report.created_at,
                area_name=area.name,
                category_name=category.name,
                severity_label=severity.label
            )
        )
    return summaries


# ---------------
# READ: detail
# ---------------

@router.get("/{report_id}", response_model=schemas.ReportDetail)
def get_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    stmt = (
        select(Report)
        .where(Report.report_id == report_id)
        .options(
            joinedload(Report.service_area),
            joinedload(Report.category),
            joinedload(Report.severity),
            joinedload(Report.status_updates)
        )
    )

    report: Report | None = db.execute(stmt).scalars().first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    # sort status history by changed_at
    history_sorted = sorted(report.status_updates, key=lambda s: s.changed_at)

    return schemas.ReportDetail(
        report_id=report.report_id,
        title=report.title,
        description=report.description,
        latitude=float(report.latitude) if report.latitude is not None else None,
        longitude=float(report.longitude) if report.longitude is not None else None,
        address=report.address,
        current_status=report.current_status,
        created_at=report.created_at,
        service_area=schemas.ServiceAreaOut.model_validate(report.service_area),
        category=schemas.CategoryOut.model_validate(report.category),
        severity=schemas.SeverityOut.model_validate(report.severity),
        status_history=[
            schemas.StatusUpdateOut.model_validate(su) for su in history_sorted
        ]
    )


# ---------------
# CREATE: report
# ---------------

@router.post("/", response_model=schemas.ReportDetail, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: schemas.ReportCreate,
    db: Session = Depends(get_db)
):
    report = Report(
        title=payload.title,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        area_id=payload.area_id,
        category_id=payload.category_id,
        severity_id=payload.severity_id,
        created_by=payload.created_by
        # current_status will default to IN_PROGRESS at DB level
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    # reload with relationships for full detail
    stmt = (
        select(Report)
        .where(Report.report_id == report.report_id)
        .options(
            joinedload(Report.service_area),
            joinedload(Report.category),
            joinedload(Report.severity),
            joinedload(Report.status_updates)
        )
    )
    report = db.execute(stmt).scalars().first()
    assert report is not None

    history_sorted = sorted(report.status_updates, key=lambda s: s.changed_at)

    return schemas.ReportDetail(
        report_id=report.report_id,
        title=report.title,
        description=report.description,
        latitude=float(report.latitude) if report.latitude is not None else None,
        longitude=float(report.longitude) if report.longitude is not None else None,
        address=report.address,
        current_status=report.current_status,
        created_at=report.created_at,
        service_area=schemas.ServiceAreaOut.model_validate(report.service_area),
        category=schemas.CategoryOut.model_validate(report.category),
        severity=schemas.SeverityOut.model_validate(report.severity),
        status_history=[
            schemas.StatusUpdateOut.model_validate(su) for su in history_sorted
        ]
    )


# ----------------------------
# UPDATE: change report status
# ----------------------------

@router.put("/{report_id}/status", response_model=schemas.StatusUpdateOut)
def update_report_status(
    report_id: int,
    payload: schemas.StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    old_status = report.current_status
    new_status = payload.new_status

    report.current_status = new_status
    note = payload.note or f"Status changed from {old_status} to {new_status}"

    su = StatusUpdate(
        report_id=report.report_id,
        status=new_status,
        note=note,
        changed_by=payload.changed_by
    )

    db.add(su)
    db.commit()
    db.refresh(su)

    return schemas.StatusUpdateOut.model_validate(su)


# ---------------
# DELETE: report
# ---------------

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # 1) delete work_part rows linked via work_order -> report
    db.execute(
        text(
            """
            DELETE FROM work_part
            WHERE wo_id IN (
                SELECT wo_id FROM work_order WHERE report_id = :rid
            )
            """
        ),
        {"rid": report_id},
    )

    # 2) delete duplicate_link rows that reference this report as either primary or duplicate
    db.execute(
        text(
            """
            DELETE FROM duplicate_link
            WHERE primary_report_id = :rid
               OR duplicate_report_id = :rid
            """
        ),
        {"rid": report_id},
    )

    # 3) delete "simple" child tables that have a report_id column
    child_tables = [
        "report_media",
        "assignment",
        "sla_clock",
        "subscription",
        "upvote",
        "comment",
        "notification",
        "status_update",
        "work_order"
    ]

    for table in child_tables:
        db.execute(
            text(f"DELETE FROM {table} WHERE report_id = :rid"),
            {"rid": report_id}\
        )

    db.delete(report)
    db.commit()
    return
