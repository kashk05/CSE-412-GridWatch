// src/pages/Departments.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getReports } from "../utils/api.js"; // <-- adjust path if needed

const LOAD_SCALE = 5; // severity-weighted open tickets * 5 -> 0–100

// Canonical departments we always want to show
const CORE_DEPTS = ["Public Works", "Transportation", "Parks & Rec", "City Services"];

function isOpenStatus(status) {
  if (!status) return false;
  const s = String(status).toUpperCase();
  return !["RESOLVED", "CLOSED"].includes(s);
}

// crude SLA: open + older than 48h
function isBreaching(report) {
  if (!isOpenStatus(report.current_status) || !report.created_at) return false;
  const created = new Date(report.created_at).getTime();
  const diffMs = Date.now() - created;
  return diffMs > 48 * 60 * 60 * 1000;
}

function hoursSince(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return (Date.now() - t) / (60 * 60 * 1000);
}

// Map categories → canonical departments when API doesn’t carry a department_name
function inferDepartmentName(report) {
  const direct =
    report.department_name ||
    report.dept_name ||
    report.department;

  if (direct && String(direct).trim() !== "") {
    return direct;
  }

  const cat = String(report.category_name || report.category || "").toLowerCase();

  if (cat.includes("light") || cat.includes("sidewalk") || cat.includes("utility")) {
    return "Public Works";
  }
  if (cat.includes("road") || cat.includes("pothole") || cat.includes("traffic") || cat.includes("lane")) {
    return "Transportation";
  }
  if (cat.includes("park") || cat.includes("playground") || cat.includes("recreation")) {
    return "Parks & Rec";
  }
  if (cat.includes("trash") || cat.includes("garbage") || cat.includes("sanitation") || cat.includes("waste")) {
    return "City Services";
  }

  // default bucket
  return "City Services";
}

// Nicer human-readable age
function formatAge(avgHours) {
  if (!avgHours || avgHours <= 0) return "—";
  if (avgHours < 48) {
    return `${avgHours.toFixed(1)} h`;
  }
  const days = avgHours / 24;
  return `${days.toFixed(1)} d`;
}

// Some nice copy per “known” department names
const DEPT_DESCRIPTIONS = {
  "Public Works":
    "Streetlights, sidewalks, utilities, and road maintenance.",
  Transportation:
    "Signals, lane closures, and transit infrastructure.",
  "Parks & Rec": "Parks, playgrounds, recreation facilities.",
  "City Services": "Waste, sanitation, and general city service requests.",
};

export default function Departments() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, setSortBy] = useState("load"); // "load" | "open" | "name"
  const [hideZeroOpen, setHideZeroOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getReports();
        if (!cancelled) {
          setReports(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Failed to load department metrics from the API.");
          setReports([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- aggregate per department ---
  const { departments, totals } = useMemo(() => {
    const map = new Map();

    reports.forEach((r) => {
      const deptName = inferDepartmentName(r);
      const key = deptName;

      if (!map.has(key)) {
        map.set(key, {
          name: deptName,
          totalCount: 0,
          openCount: 0,
          highOpenCount: 0,
          breachingCount: 0,
          loadScore: 0,
          sumOpenAgeHours: 0, // for avg age of open
        });
      }

      const entry = map.get(key);
      entry.totalCount += 1;

      const open = isOpenStatus(r.current_status);
      const sev = String(r.severity_label || "").toUpperCase();
      const weight =
        sev.includes("HIGH") ? 3 : sev.includes("LOW") ? 1 : 2;

      if (open) {
        entry.openCount += 1;
        entry.loadScore += weight;

        const age = hoursSince(r.created_at);
        entry.sumOpenAgeHours += age;

        if (sev.includes("HIGH")) {
          entry.highOpenCount += 1;
        }
        if (isBreaching(r)) {
          entry.breachingCount += 1;
        }
      }
    });

    // Make sure our four core departments always exist
    CORE_DEPTS.forEach((name) => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          totalCount: 0,
          openCount: 0,
          highOpenCount: 0,
          breachingCount: 0,
          loadScore: 0,
          sumOpenAgeHours: 0,
        });
      }
    });

    // Also keep any extra departments we discovered from data
    const rows = Array.from(map.values()).map((entry) => {
      const loadIndex = Math.min(100, entry.loadScore * LOAD_SCALE);
      const avgAgeHours =
        entry.openCount > 0
          ? entry.sumOpenAgeHours / entry.openCount
          : 0;

      let status = "Stable";
      let tone = "green";

      if (loadIndex > 80 || entry.breachingCount > 5) {
        status = "Critical";
        tone = "red";
      } else if (loadIndex > 50 || entry.breachingCount > 0) {
        status = "Under strain";
        tone = "amber";
      }

      return {
        ...entry,
        loadIndex,
        avgAgeHours,
        status,
        tone,
      };
    });

    const totals = rows.reduce(
      (acc, d) => {
        acc.departments += 1;
        acc.totalOpen += d.openCount;
        acc.totalHighOpen += d.highOpenCount;
        acc.totalBreaching += d.breachingCount;
        return acc;
      },
      { departments: 0, totalOpen: 0, totalHighOpen: 0, totalBreaching: 0 }
    );

    return { departments: rows, totals };
  }, [reports]);

  // Apply UI filters & sorting
  const visibleDepts = useMemo(() => {
    let rows = departments;

    if (hideZeroOpen) {
      rows = rows.filter((d) => d.openCount > 0);
    }

    rows = [...rows].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "open") {
        return b.openCount - a.openCount || b.loadIndex - a.loadIndex;
      }
      // default: sort by loadIndex
      return b.loadIndex - a.loadIndex || b.openCount - a.openCount;
    });

    return rows;
  }, [departments, hideZeroOpen, sortBy]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6 lg:px-8">
        {/* Header */}
        <section className="mb-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Department Load
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50">
            Departments
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            See which teams are under pressure, how many reports are in each
            queue, and where the grid is feeling the most strain.
          </p>
        </section>

        {/* Top summary row */}
        <section className="mb-6 grid gap-3 md:grid-cols-4 text-xs">
          <SummaryCard
            label="Active departments"
            value={totals.departments}
            hint="With at least one report"
          />
          <SummaryCard
            label="Open reports"
            value={totals.totalOpen}
            hint="Across all departments"
          />
          <SummaryCard
            label="High-severity open"
            value={totals.totalHighOpen}
            hint="High impact in queue"
          />
          <SummaryCard
            label="Breaching SLA (approx.)"
            value={totals.totalBreaching}
            hint="Open > 48 hours"
            tone="red"
          />
        </section>

        {/* Controls */}
        <section className="mb-4 flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1">
            <span className="px-2 text-[0.7rem] text-slate-400">
              Sort by
            </span>
            <SortPill
              active={sortBy === "load"}
              onClick={() => setSortBy("load")}
            >
              Load index
            </SortPill>
            <SortPill
              active={sortBy === "open"}
              onClick={() => setSortBy("open")}
            >
              Open count
            </SortPill>
            <SortPill
              active={sortBy === "name"}
              onClick={() => setSortBy("name")}
            >
              Name
            </SortPill>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[0.75rem] text-slate-300">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-500"
              checked={hideZeroOpen}
              onChange={(e) => setHideZeroOpen(e.target.checked)}
            />
            Hide departments with 0 open reports
          </label>
        </section>

        {/* Content */}
        {loading && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 text-sm text-slate-400">
            Loading department metrics…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-rose-700 bg-rose-900/20 p-6 text-sm text-rose-200">
            {error}
          </div>
        )}

        {!loading && !error && visibleDepts.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 text-sm text-slate-400">
            No departments found. File a report to see load distribution.
          </div>
        )}

        {!loading && !error && visibleDepts.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2">
            {visibleDepts.map((dept) => (
              <DepartmentCard key={dept.name} dept={dept} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

/* ------------ small subcomponents ------------ */

function SummaryCard({ label, value, hint, tone = "default" }) {
  const toneClasses =
    tone === "red"
      ? "text-rose-200"
      : "text-slate-200";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3">
      <p className="text-[0.7rem] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-50">{value}</p>
      <p className={`mt-1 text-[0.7rem] ${toneClasses}`}>{hint}</p>
    </div>
  );
}

function SortPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 text-[0.7rem] font-medium transition " +
        (active
          ? "bg-slate-100 text-slate-900 shadow-sm"
          : "text-slate-300 hover:bg-slate-800/80 hover:text-sky-200")
      }
    >
      {children}
    </button>
  );
}

function DepartmentCard({ dept }) {
  const desc =
    DEPT_DESCRIPTIONS[dept.name] ||
    "General service and issue routing for this department.";

  const statusTone =
    dept.tone === "red"
      ? "bg-rose-500/10 text-rose-200 border-rose-500/40"
      : dept.tone === "amber"
      ? "bg-amber-500/10 text-amber-200 border-amber-400/40"
      : "bg-emerald-500/10 text-emerald-200 border-emerald-400/40";

  const loadLabel =
    dept.loadIndex >= 90
      ? "Severe"
      : dept.loadIndex >= 70
      ? "High"
      : dept.loadIndex >= 40
      ? "Moderate"
      : "Light";

  const prettyAge = formatAge(dept.avgAgeHours);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      {/* soft glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-sky-400/10 via-teal-400/10 to-emerald-400/5 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-50">
            {dept.name}
          </h2>
          <p className="mt-1 text-[0.75rem] text-slate-400">{desc}</p>
        </div>
        <span
          className={
            "inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-medium " +
            statusTone
          }
        >
          {dept.status}
        </span>
      </div>

      {/* progress bar */}
      <div className="relative mt-4">
        <p className="text-[0.7rem] text-slate-400 mb-1">
          Queue load • {loadLabel}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400"
            style={{ width: `${dept.loadIndex}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[0.7rem] text-slate-400">
          <span>{Math.round(dept.loadIndex)} / 100</span>
          <span>{dept.openCount} open</span>
        </div>
      </div>

      {/* metrics row */}
      <div className="mt-4 grid gap-2 text-[0.7rem] md:grid-cols-3">
        <MetricChip
          label="High-severity open"
          value={dept.highOpenCount}
        />
        <MetricChip
          label="Breaching SLA"
          value={dept.breachingCount}
          tone={dept.breachingCount > 0 ? "red" : "default"}
        />
        <MetricChip
          label="Avg age (open)"
          value={prettyAge}
        />
      </div>
    </div>
  );
}

function MetricChip({ label, value, tone = "default" }) {
  const base =
    tone === "red"
      ? "border-rose-500/40 bg-rose-500/5 text-rose-200"
      : "border-slate-700 bg-slate-900/70 text-slate-200";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${base}`}>
      <p className="text-[0.65rem] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
