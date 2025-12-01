# GridWatch — Smart Urban Issue Reporting Platform

GridWatch is a full-stack web application that allows residents, students, and staff to report urban infrastructure issues (e.g., potholes, lighting, and sanitation) and track how the city or campus departments respond over time.

The project showcases a production-style architecture with:
- **FastAPI + PostgreSQL** backend
- **React** frontend
- **Normalized relational schema** (CSE 412 Phase 2) carried through to an ORM-based backend (Phase 3)
- **Analytics dashboard** for high-level operational monitoring (Activity Pulse, open reports, SLA metrics, etc.)

This README documents the full setup and implementation plan for both **backend** and **frontend**, including how to run, test, and extend the system.

---

## 1. Repository Structure
> Folder names may differ slightly; adjust paths below to match your final repo layout.

```text
.
├── backend/
│   ├── main.py                # FastAPI app entrypoint
│   ├── core/
│   │   └── config.py          # Settings (DATABASE_URL, etc.)
│   ├── db/
│   │   ├── session.py         # SQLAlchemy engine + SessionLocal
│   │   └── init_db.py         # Optional: programmatic DB bootstrap
│   ├── models/                # SQLAlchemy ORM models
│   ├── schemas/               # Pydantic models (request/response)
│   ├── crud/                  # Data access layer
│   ├── api/
│   │   └── endpoints/         # FastAPI routers (reports, departments, etc.)
│   ├── tests/                 # Backend unit / integration tests (pytest)
│   └── requirements.txt       # Python dependencies
├── db/
│   ├── schema.sql             # DDL from Phase 2 (tables, constraints)
│   └── seed_data.sql          # Sample data for demo
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.jsx       # Main dashboard (Activity Pulse, etc.)
│   │   ├── components/        # Reusable React components
│   │   ├── utils/
│   │   │   └── api.js         # HTTP client wrappers to FastAPI
│   │   └── main.jsx / App.jsx # Frontend entry + routing
│   ├── package.json           # Frontend dependencies & scripts
│   └── vite.config.js / ...   # Build tooling (Vite or CRA config)
├── .env.example               # Example environment variables
├── README.md                  # This file
└── LICENSE / docs/            # (Optional) related docs and assets
````

---

## 2. Tech Stack

**Backend**

* Python 3.11+
* FastAPI (REST API framework)
* PostgreSQL (relational database)
* SQLAlchemy + psycopg2 (ORM + DB driver)
* Pydantic (validation / serialization)
* pytest (testing)
* Uvicorn (ASGI server)

**Frontend**

* React (SPA UI)
* React Router (routing)
* Fetch / Axios (API calls, depending on implementation)
* Vite or Create React App (build tooling)

---

## 3. Database Design (Phase 2 → Phase 3)

Core normalized schema (mirrors the ER & DDL from Phase 2):

* **user**

  * Tracks application users (residents/reporters, staff, admins).
* **department**

  * Logical departments responsible for remediation (e.g., Public Works, Sanitation).
* **service_area**

  * Geographical or functional coverage areas (e.g., “Downtown Core”, “Campus North”).
* **category**

  * Issue categories (Lighting, Roadway, Sanitation, etc.).
* **severity**

  * Severity levels (Low, Medium, High, Critical).
* **report**

  * Main incident table: who reported, where, when, category, severity, current status, timestamps.
* **status_update**

  * Time-stamped status changes and notes (Open → In Progress → Resolved, etc.).

> All constraints, PK/FK relationships, and indexes are defined in `db/schema.sql` and match the Phase 2 relational mapping.

---

## 4. Setup Instructions

### 4.1. Prerequisites

* **Python**: 3.11+
* **Node.js + npm**: LTS (e.g., Node 18+)
* **PostgreSQL**: 14+
* Command line tools: `psql`, `git`

---

### 4.2. Clone the Repository

```bash
git clone https://github.com/kashk05/CSE-412-GridWatch.git
cd CSE-412-GridWatch
```

---

## 5. Backend Setup (FastAPI + PostgreSQL)

### 5.1. Create and Activate a Virtual Environment

```bash
cd backend

# Create virtualenv (use your preferred tool)
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

### 5.2. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> `requirements.txt` includes FastAPI, SQLAlchemy, PostgreSQL driver (`psycopg2-binary`), pytest, and other backend dependencies.

### 5.3. Configure Database Connection

The backend reads the DB URL from `backend/core/config.py`:

```python
# backend/core/config.py
import os
from functools import lru_cache
from pydantic import BaseModel

class Settings(BaseModel):
    database_url: str

@lru_cache()
def get_settings() -> Settings:
    default_url = "postgresql+psycopg2://postgres:postgres@localhost:5432/gridwatch"
    return Settings(
        database_url=os.getenv("DATABASE_URL", default_url)
    )

settings = get_settings()
```

You **can either**:

1. Use the default credentials (PostgreSQL `postgres:postgres` on `localhost:5432` with DB named `gridwatch`), **or**
2. Override via environment variable:

```bash
# Example custom DATABASE_URL
export DATABASE_URL="postgresql+psycopg2://<user>:<password>@localhost:5432/gridwatch"
```

On Windows (PowerShell):

```powershell
$env:DATABASE_URL="postgresql+psycopg2://<user>:<password>@localhost:5432/gridwatch"
```

---

### 5.4. Create the Database

Start your PostgreSQL server, then run:

```bash
# Create DB if it doesn't exist
psql -U postgres -c "CREATE DATABASE gridwatch;"
```

> Adjust user/host/port as needed.

---

### 5.5. Apply Schema and Seed Data (DDL + Sample Rows)

From the repo root (or `db/` folder), run:

```bash
# Apply Phase 2 DDL (tables, constraints)
psql -U postgres -d gridwatch -f db/ProjectSchema.sql

# (Optional but recommended) initialize demo
psql -U postgres -d gridwatch -f db/Initialize.sql
```

This creates all tables (`user`, `department`, `service_area`, `category`, `severity`, `report`, `status_update`, etc.) and inserts sample departments, service areas, categories, severities, and a few reports.

---

### 5.6. Run the Backend Server (Development)

From `backend/` (with your virtualenv active):

```bash
uvicorn backend.main:app --reload --port 8000
```

* API base URL (local dev): `http://127.0.0.1:8000`
* OpenAPI / Swagger UI: `http://127.0.0.1:8000/docs`

---

## 6. Frontend Setup (React)

### 6.1. Install Dependencies

From the repo root:

```bash
cd frontend
npm install
```

This installs React, React Router, and any UI libraries used by the project.

### 6.2. Configure API Base URL

The frontend talks to the FastAPI backend via `utils/api.js`.

Example:

```javascript
// frontend/src/utils/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function getReports() {
  const res = await fetch(`${API_BASE_URL}/api/reports`);
  if (!res.ok) {
    throw new Error("Failed to fetch reports");
  }
  return res.json();
}

// ... other endpoints (departments, metrics, etc.)
```

Create a `.env` file in `frontend/` (if using Vite):

```bash
# frontend/.env
VITE_API_BASE_URL="http://127.0.0.1:8000"
```

---

### 6.3. Run the Frontend (Development)

```bash
cd frontend
npm run dev
```

Default dev URL (for Vite): `http://127.0.0.1:5173`

The app will connect to the backend at `VITE_API_BASE_URL`.

---

## 7. Core Features & Implementation Details

### 7.1. Reporting Flow

**Goal:** Allow residents to submit new urban issue reports and track progress.

Typical endpoint structure (FastAPI):

* `POST /api/reports`

  * Body includes: reporter info (or user id), category, service area, severity, location, title, description, optional attachments/coordinates.
  * Backend:

    * Validates with Pydantic schema (e.g., `ReportCreate`).
    * Upserts related FKs (if necessary) or validates they exist.
    * Inserts into `report` table with an initial status (e.g., `Open`).
    * Creates an initial `status_update` row.

* `GET /api/reports`

  * Supports filters: status, severity, department, service_area, date range.
  * Joins relevant tables to return a list of enriched report objects.

* `GET /api/reports/{report_id}`

  * Returns full detail, including status history (via `status_update`).

* `PATCH /api/reports/{report_id}/status`

  * Staff/department updates status (e.g., `In Progress`, `Resolved`) and notes.
  * Appends to `status_update` and updates current status in `report`.

---

### 7.2. Dashboard & Activity Pulse (Home.jsx)

The **Home** page is the primary landing page for both residents and staff. It summarizes system health and workload:

* **Activity Pulse**
  Real-time snapshot combining metrics like:

  * Number of **new reports in the last X hours** (e.g., 24h).
  * Percentage of reports currently in `Open` or `In Progress`.
  * Trend indicator (up/down vs previous window).

* **Total Open Reports**
  Count of reports with `status = 'Open'` (or equivalent).

* **Average Time to First Response**

  * Computed on the backend as average (`status_update.created_at(first-response)` - `report.created_at`) for resolved or active reports.

* **On-Time Completion Rate**

  * Percentage of resolved reports which met a target SLA (e.g., resolved within 48 hours of creation).

Backend typically exposes a consolidated endpoint:

* `GET /api/metrics/dashboard`

  * Returns JSON with:

    * `activity_pulse`: { newReportsLast24h, openCount, trend, ... }
    * `open_reports`: integer
    * `avg_first_response_minutes`: float
    * `on_time_completion_rate`: float (0–1 or percentage)
  * Computed with Postgres queries aggregating `report` and `status_update`.

Frontend:

* `Home.jsx` calls `getDashboardMetrics()` (from `utils/api.js`).
* Cards on top row (`Activity Pulse`, `Total Open Reports`, etc.) display live values.
* The “rough time ago” helper (`timeAgo(iso)`) is used to show human-readable timestamps (e.g., `"12 min ago"`, `"3 hrs ago"`).

---

### 7.3. Report List & Detail Views

**Report List**

* Displays:

  * Title, category, department, severity, current status, `timeAgo`, and location.
* Allows sorting / filtering by:

  * Severity (High/Medium/Low)
  * Category
  * Department
  * Status

**Report Detail**

* Shows:

  * Full description, location, reporter (anonymous or user), attachments (if any).
  * Timeline of `status_update` entries (e.g., “Opened”, “Assigned”, “In Progress”, “Resolved”) with timestamps and notes.

---

### 7.4. Data Access Layer (CRUD)

Backend uses a thin CRUD layer (e.g., `backend/crud/report.py`):

* `get_report(db, report_id)`
* `get_reports(db, filters)`
* `create_report(db, report_create)`
* `update_report_status(db, report_id, status_update)`

This keeps FastAPI endpoint handlers simple and isolates SQL/ORM logic for easier testing.

---

## 8. Running Tests

### 8.1. Backend Tests (pytest)

From `backend/` with virtualenv active:

```bash
pytest
```

Typical test coverage:

* Model constraints and relationships
* CRUD functions (create, read, update)
* API endpoints (using FastAPI `TestClient`)
* Metric calculations (Activity Pulse, SLA rates, etc.)

### 8.2. Frontend Tests (if configured)

From `frontend/`:

```bash
npm test
```

Covers:

* Component rendering (e.g., `Home` dashboard cards appear with mock data).
* API utility mocking (`getReports`, `getDashboardMetrics`).
* Basic routing behavior.

---

## 9. Development Workflow / Common Tasks

### 9.1. Resetting the Database

If you need a clean slate:

```bash
# Drop and recreate DB
psql -U postgres -c "DROP DATABASE IF EXISTS gridwatch;"
psql -U postgres -c "CREATE DATABASE gridwatch;"

# Re-apply schema & seed data
psql -U postgres -d gridwatch -f db/ProjectSchema.sql
psql -U postgres -d gridwatch -f db/Initialize.sql
```

---

### 9.2. Typical Dev Loop

1. **Start PostgreSQL**.

2. **(Optional)** Reset DB (see above).

3. **Run backend**:

   ```bash
   cd backend
   source .venv/bin/activate      # or .venv\Scripts\activate on Windows
   uvicorn backend.main:app --reload --port 8000
   ```

4. **Run frontend**:

   ```bash
   cd frontend
   npm run dev
   ```

5. Visit `http://127.0.0.1:5173` (or printed dev URL).

---

## 10. Deployment Notes (High-Level)

> Course projects typically run in local dev, but this section outlines a production-style path.

* **Backend**

  * Containerize FastAPI with Uvicorn/Gunicorn.
  * Use a managed Postgres instance.
  * Store `DATABASE_URL` and secrets in environment variables.
  * Use HTTPS and proper CORS configuration.

* **Frontend**

  * Build with `npm run build`.
  * Serve static assets via Nginx or a static host (Netlify, Vercel, etc.).
  * Set production `VITE_API_BASE_URL` to point at the deployed FastAPI endpoint.

* **Migrations**

  * Optionally introduce Alembic for versioned DB migrations if continuing beyond the course.

---

## 11. Contributions & Roles
* **Backend & Data Layer** – Design and implementation of FastAPI, SQLAlchemy models, CRUD, and metrics queries.
* **Frontend & UI Flows** – React components, routing, dashboard cards, report forms, and styling.
* **Analytics & Integration** – Activity Pulse, SLA metrics, testing, and end-to-end integration.

---

## 12. Troubleshooting

* **Backend cannot connect to DB**

  * Check `DATABASE_URL` in environment and `core/config.py`.
  * Verify Postgres is running and the `gridwatch` DB exists.
* **CORS errors in browser**

  * Ensure FastAPI has CORS middleware configured to allow the frontend origin (e.g., `http://127.0.0.1:5173`).
* **Frontend shows no data**

  * Confirm backend is running on `http://127.0.0.1:8000`.
  * Check network tab in DevTools for failing requests.
* **Time formatting odd / wrong timezone**

  * The `timeAgo` helper uses client-side `Date`; verify the backend timestamps are in ISO 8601 UTC and adjust if needed.

---

**GridWatch** demonstrates how a carefully designed database, a modern Python backend, and a responsive React frontend can work together to create a practical, analytics-driven urban issue reporting platform.

For questions or improvements, please open an issue or submit a pull request.

---
