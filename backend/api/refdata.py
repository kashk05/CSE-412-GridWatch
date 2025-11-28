# backend/api/refdata.py
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.db.models import ServiceArea, Category, Severity
from backend.schemas import reports as schemas

router = APIRouter(prefix="", tags=["reference"])


@router.get("/service-areas", response_model=list[schemas.ServiceAreaOut])
def list_service_areas(db: Session = Depends(get_db)):
    stmt = select(ServiceArea).order_by(ServiceArea.name)
    areas = db.execute(stmt).scalars().all()
    return areas

@router.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    stmt = select(Category).order_by(Category.name)
    categories = db.execute(stmt).scalars().all()
    return categories

@router.get("/severities", response_model=list[schemas.SeverityOut])
def list_severities(db: Session = Depends(get_db)):
    stmt = select(Severity).order_by(Severity.weight.desc())
    severities = db.execute(stmt).scalars().all()
    return severities

@router.get("/statuses", response_model=list[str])
def list_statuses():
    return [
        "SUBMITTED",
        "TRIAGED",
        "IN_PROGRESS",
        "ON_HOLD",
        "RESOLVED",
        "CLOSED",
        "MERGED"
    ]
