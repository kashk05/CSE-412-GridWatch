# backend/main.py
from fastapi import FastAPI, HTTPException
from sqlalchemy import text

from backend.db.session import SessionLocal
from backend.db import models
from backend.api import reports, refdata


app = FastAPI(
    title="CSE 412 GridWatch Reporting API",
    version="0.2.0"
)

@app.get("/health")
def health_check():
    """
    Basic health check.

    Returns {"status": "ok"} if:
      - FastAPI app is running
      - DB responds to SELECT 1
    """
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Database connection failed") from exc
    
app.include_router(refdata.router)
app.include_router(reports.router)
