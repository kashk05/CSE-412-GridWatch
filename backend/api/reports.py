# backend/api/reports.py
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.schemas import reports as schemas
from backend.services import report_service

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
    return report_service.list_reports(
        db=db,
        search=search,
        area_id=area_id,
        category_id=category_id,
        status_filter=status_filter
    )


# ---------------
# READ: detail
# ---------------

@router.get("/{report_id}", response_model=schemas.ReportDetail)
def get_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    return report_service.get_report_detail(db=db, report_id=report_id)


# ---------------
# CREATE: report
# ---------------

@router.post("/", response_model=schemas.ReportDetail, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: schemas.ReportCreate,
    db: Session = Depends(get_db)
):
    return report_service.create_report(db=db, payload=payload)


# ----------------------------
# UPDATE: change report status
# ----------------------------

@router.put("/{report_id}/status", response_model=schemas.StatusUpdateOut)
def update_report_status(
    report_id: int,
    payload: schemas.StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    return report_service.update_status(
        db=db,
        report_id=report_id,
        payload=payload
    )


# ---------------
# DELETE: report
# ---------------

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    report_service.delete_report(db=db, report_id=report_id)
    # 204: no body
    return
