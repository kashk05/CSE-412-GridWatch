# backend/main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text

from backend.db.session import SessionLocal
from backend.api import reports, refdata


app = FastAPI(
    title="CSE 412 GridWatch Reporting API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
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

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(
            status_code=404,
            content={"detail": "Resource not found"}
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Central 422 handler for body/query/path validation issues
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )