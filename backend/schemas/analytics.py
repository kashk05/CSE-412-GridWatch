# backend/schemas/analytics.py
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict

"""
class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assignment_id: int
    report_id: int
    dept_id: int
    assignee_user_id: int
    assigned_at: datetime
    accepted_at: datetime
    is_active: bool
"""
class HotSpots(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    area_id: int
    category_id: int
    report_count: int

class ResolutionTimes(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    avg_resolution_days: float