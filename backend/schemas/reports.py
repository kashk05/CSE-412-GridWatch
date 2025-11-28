# backend/schemas/reports.py
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


# ----------------------
# Reference data outputs
# ----------------------

class ServiceAreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    area_id: int
    name: str

class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    name: str
    description: Optional[str] = None
    default_sla_hours: int

class SeverityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    severity_id: int
    label: str
    weight: float


# ----------------------
# Status updates
# ----------------------

class StatusUpdateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status_id: int
    status: str
    note: Optional[str] = None
    changed_at: datetime

class StatusUpdateRequest(BaseModel):
    new_status: str
    note: Optional[str] = None
    changed_by: int


# ----------------------
# Report models
# ----------------------

class ReportBase(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    category_id: int
    severity_id: int
    area_id: int

class ReportCreate(ReportBase):
    created_by: int

class ReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: int
    title: str
    current_status: str
    created_at: datetime
    category_name: str
    area_name: str
    severity_label: str

class ReportDetail(BaseModel):
    report_id: int
    title: str
    description: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    current_status: str
    created_at: datetime

    category: CategoryOut
    service_area: ServiceAreaOut
    severity: SeverityOut

    status_history: List[StatusUpdateOut]
