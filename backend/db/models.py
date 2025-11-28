# backend/db/models.py
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB


class Base(DeclarativeBase):
    pass


# --------------------
# Core reference tables
# --------------------

class User(Base):
    """
    Maps to table: "user"

    Columns:
      - user_id (PK)
      - name
      - email (unique, with email_has_at check)
      - password_hash
      - phone
      - role (user_role enum in DB, mapped as string)
      - is_active
      - created_at
    """
    __tablename__ = "user"
    __table_args__ = (
        CheckConstraint(
            "(email IS NULL OR position('@' IN email) > 1)",
            name="email_has_at"
        ),
    )

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[Optional[str]] = mapped_column("email", Text, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String, nullable=False, default="RESIDENT")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default="now()"
    )

    # relationships
    created_reports: Mapped[List["Report"]] = relationship(
        "Report",
        back_populates="created_by_user",
        foreign_keys="Report.created_by"
    )
    status_updates: Mapped[List["StatusUpdate"]] = relationship(
        "StatusUpdate",
        back_populates="changed_by_user",
        foreign_keys="StatusUpdate.changed_by"
    )


class Department(Base):
    """
    Maps to table: department

    Columns:
      - dept_id (PK)
      - name (unique)
      - email (email_has_at check)
      - phone
    """
    __tablename__ = "department"
    __table_args__ = (
        CheckConstraint(
            "(email IS NULL OR position('@' IN email) > 1)",
            name="email_has_at"
        ),
    )

    dept_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    email: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(Text)

    # relationships
    service_areas: Mapped[List["ServiceArea"]] = relationship(
        "ServiceArea",
        back_populates="department"
    )


class ServiceArea(Base):
    """
    Maps to table: service_area

    Columns:
      - area_id (PK)
      - name (unique)
      - geojson (JSONB, enforced as object)
      - dept_id (FK to department.dept_id, unique)
    """
    __tablename__ = "service_area"
    __table_args__ = (
        CheckConstraint(
            "jsonb_typeof(geojson) = 'object'",
            name="geojson_is_object"
        ),
    )

    area_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    geojson: Mapped[dict] = mapped_column(JSONB, nullable=False)
    dept_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("department.dept_id"),
        nullable=False,
        unique=True
    )

    # relationships
    department: Mapped["Department"] = relationship(
        "Department", 
        back_populates="service_areas"
    )
    reports: Mapped[List["Report"]] = relationship(
        "Report", 
        back_populates="service_area"
    )


class Category(Base):
    """
    Maps to table: category

    Columns:
      - category_id (PK)
      - name (unique)
      - description
      - default_sla_hours (sla_hours_positive check)
    """
    __tablename__ = "category"
    __table_args__ = (
        CheckConstraint(
            "default_sla_hours > 0", 
            name="sla_hours_positive"
        ),
    )

    category_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    default_sla_hours: Mapped[int] = mapped_column()

    # relationships
    reports: Mapped[List["Report"]] = relationship(
        "Report",
        back_populates="category"
    )


class Severity(Base):
    """
    Maps to table: severity

    Columns:
      - severity_id (PK)
      - label
      - weight (NUMERIC(6,2), weight_positive check)
    """
    __tablename__ = "severity"
    __table_args__ = (
        CheckConstraint(
            "weight > 0",
            name="weight_positive"
        ),
    )

    severity_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[Numeric] = mapped_column(
        Numeric(6, 2),
        nullable=False,
        default=1.00
    )

    # relationships
    reports: Mapped[List["Report"]] = relationship(
        "Report",
        back_populates="severity"
    )


# ----------------------
# Report + status update
# ----------------------

class Report(Base):
    """
    Maps to table: report

    Columns:
      - report_id (PK)
      - title
      - description
      - latitude / longitude (NUMERIC(9,6))
      - geohash
      - address
      - created_at (default now())
      - created_by (FK to user.user_id)
      - category_id (FK to category.category_id)
      - severity_id (FK to severity.severity_id)
      - area_id (FK to service_area.area_id)
      - current_status (report_status enum in DB, mapped as string)
    """
    __tablename__ = "report"

    report_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    latitude: Mapped[Optional[Numeric]] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Optional[Numeric]] = mapped_column(Numeric(9, 6))
    geohash: Mapped[Optional[str]] = mapped_column(Text)
    address: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default="now()"
    )
    current_status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="IN_PROGRESS"
    )
    created_by: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("user.user_id"), 
        nullable=False
    )
    category_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("category.category_id"), 
        nullable=False
    )
    severity_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("severity.severity_id"), 
        nullable=False
    )
    area_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("service_area.area_id"), 
        nullable=False
    )

    # relationships
    created_by_user: Mapped["User"] = relationship(
        "User", 
        back_populates="created_reports", 
        foreign_keys=[created_by]
    )
    category: Mapped["Category"] = relationship(
        "Category", 
        back_populates="reports"
    )
    severity: Mapped["Severity"] = relationship(
        "Severity", 
        back_populates="reports"
    )
    service_area: Mapped["ServiceArea"] = relationship(
        "ServiceArea", 
        back_populates="reports"
    )
    status_updates: Mapped[List["StatusUpdate"]] = relationship(
        "StatusUpdate",
        back_populates="report",
        cascade="all, delete-orphan"
    )


class StatusUpdate(Base):
    """
    Maps to table: status_update

    Columns:
      - status_id (PK)
      - report_id (FK to report.report_id)
      - status (report_status enum in DB, mapped as string)
      - note
      - changed_by (FK to user.user_id)
      - changed_at (default now())
    """
    __tablename__ = "status_update"

    status_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("report.report_id"), 
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String, 
        nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(Text)
    changed_by: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("user.user_id"), 
        nullable=False
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False,
        default="now()"
    )

    # relationships
    report: Mapped["Report"] = relationship(
        "Report", 
        back_populates="status_updates"
    )
    changed_by_user: Mapped["User"] = relationship(
        "User", 
        back_populates="status_updates", 
        foreign_keys=[changed_by]
    )

class Assignment(Base):
    """
    Maps to table: assignment

    Columns:
      - assignment_id (PK)
      - report_id (FK → report.report_id)
      - dept_id (FK → department.dept_id)
      - assignee_user_id (FK → user.user_id)
      - assigned_at (timestamp)
      - accepted_at (timestamp)
      - is_active (boolean)
    """

    __tablename__ = "assignment"

    assignment_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("report.report_id", ondelete="CASCADE"),
        nullable=False,
    )

    dept_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("department.dept_id", ondelete="CASCADE"),
        nullable=False,
    )

    assignee_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey('"user".user_id', ondelete="SET NULL"),
        nullable=True,
    )

    assigned_at: Mapped[datetime] = mapped_column(nullable=False)
    accepted_at: Mapped[Optional[datetime]] = mapped_column()
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    #relationships
    report: Mapped["Report"] = relationship(
        "Report",
        back_populates="assignments",
    )

    department: Mapped["Department"] = relationship(
        "Department",
        back_populates="assignments",
    )

    assignee: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="assignments",
    )
