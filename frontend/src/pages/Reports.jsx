// src/pages/Reports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getReports } from "../utils/api.js";

const PER_PAGE = 25;

// --- helpers reused from Home ---

function timeAgo(iso) {
  if (!iso) return "";
  const created = new Date(iso);
  const diffMs = Date.now() - created.getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hr${diffH === 1 ? "" : "s"} ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} day${diffD === 1 ? "" : "s"} ago`;
}

function isOpenStatus(status) {
  if (!status) return false;
  const s = status.toUpperCase();
  return !["RESOLVED", "CLOSED"].includes(s);
}

// crude SLA breach: open + older than 48h
function isBreaching(record) {
  if (!isOpenStatus(record.current_status) || !record.created_at) return false;
  const created = new Date(record.created_at);
  const diffMs = Date.now() - created.getTime();
  return diffMs > 48 * 60 * 60 * 1000;
}

// CSV escaping
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    severity: "all", // "all" | "high"
    status: "all", // "all" | "open"
    breachingOnly: false,
    last24h: false,
  });

  const [page, setPage] = useState(1);

  // 🔍 search state
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);

  const navigate = useNavigate();

  // ---- core loader that can take backend query params ----
  async function loadReports(params = {}) {
    try {
      setLoading(true);
      const data = await getReports(params); // backend /reports with optional ?search=
      setReports(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load reports from the API.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  // ---- initial load ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
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
          setError("Failed to load reports from the API.");
          setReports([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- apply filters in-memory ----
  const filtered = useMemo(() => {
    const now = Date.now();

    return reports.filter((r) => {
      const created = r.created_at ? new Date(r.created_at).getTime() : null;

      if (filters.last24h && created !== null) {
        const diff = now - created;
        if (diff > 24 * 60 * 60 * 1000) return false;
      }

      if (filters.severity === "high") {
        if ((r.severity_label || "").toUpperCase() !== "HIGH") return false;
      }

      if (filters.status === "open") {
        if (!isOpenStatus(r.current_status)) return false;
      }

      if (filters.breachingOnly) {
        if (!isBreaching(r)) return false;
      }

      return true;
    });
  }, [reports, filters]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPageReports = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  // ---- filter handlers ----
  const handleAllGrids = () => {
    setFilters({
      severity: "all",
      status: "all",
      breachingOnly: false,
      last24h: false,
    });
  };

  const toggleHighSeverity = () => {
    setFilters((prev) => ({
      ...prev,
      severity: prev.severity === "high" ? "all" : "high",
    }));
  };

  const toggleOpen = () => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === "open" ? "all" : "open",
    }));
  };

  const toggleBreaching = () => {
    setFilters((prev) => ({
      ...prev,
      breachingOnly: !prev.breachingOnly,
      // breaching implies open-ish, but we won't force it here
    }));
  };

  const toggleLast24h = () => {
    setFilters((prev) => ({
      ...prev,
      last24h: !prev.last24h,
    }));
  };

  // ---- search handler → calls backend with ?search= ----
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchText.trim();

    setSearching(true);
    await loadReports(q ? { search: q } : {});
    setSearching(false);
    setPage(1);
  };

  // ---- CSV export of *filtered* reports ----
  const handleExportCsv = () => {
    if (!filtered.length) return;

    const header = [
      "Report ID",
      "Title",
      "Area",
      "Category",
      "Status",
      "Severity",
      "Created At",
    ];

    const rows = filtered.map((r) => [
      r.report_id,
      r.title,
      r.area_name,
      r.category_name,
      r.current_status,
      r.severity_label,
      r.created_at,
    ]);

    const csvLines = [header, ...rows].map((row) =>
      row.map(csvEscape).join(",")
    );
    const csv = csvLines.join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "gridwatch_reports.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6 lg:px-8">
        {/* Header */}
        <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Issue Directory
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-50">
              All Reports
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Browse and filter every issue logged in your grid. Use severity,
              status, and search to triage what matters first.
            </p>
          </div>

          {/* search + new */}
          <div className="flex flex-wrap items-center gap-3">
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs"
            >
              <input
                type="text"
                className="bg-transparent text-slate-100 placeholder:text-slate-500 outline-none w-40 md:w-56"
                placeholder="Search by title…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <button
                type="submit"
                className="rounded-full bg-slate-800 px-3 py-1 text-[0.7rem] text-slate-100"
                disabled={searching}
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </form>

            <Link
              to="/reports/new"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-sky-500/30 hover:opacity-95"
            >
              + New Report
            </Link>
          </div>
        </section>

        {/* Filter row */}
        <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterPill
              label="All grids"
              active={
                filters.severity === "all" &&
                filters.status === "all" &&
                !filters.breachingOnly &&
                !filters.last24h
              }
              onClick={handleAllGrids}
            />
            <FilterPill
              label="High severity"
              active={filters.severity === "high"}
              onClick={toggleHighSeverity}
            />
            <FilterPill
              label="Open"
              active={filters.status === "open"}
              onClick={toggleOpen}
            />
            <FilterPill
              label="Breaching SLA"
              active={filters.breachingOnly}
              onClick={toggleBreaching}
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={toggleLast24h}
              className={
                "rounded-full border px-3 py-1.5 text-[0.7rem] transition " +
                (filters.last24h
                  ? "border-sky-400 bg-sky-500/10 text-sky-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-sky-400/70 hover:text-sky-100")
              }
            >
              Filter • Last 24h
            </button>
            <button
              onClick={handleExportCsv}
              className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[0.7rem] text-slate-200 hover:border-sky-400/70 hover:text-sky-100"
            >
              Export CSV
            </button>
          </div>
        </section>

        {/* Meta row: counts + pagination controls */}
        <section className="mb-3 flex flex-col gap-2 text-[0.7rem] text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>
            Showing {filtered.length} of {reports.length} reports
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={page === totalPages}
              className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>

        {/* Report list */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
          {loading && (
            <div className="text-[0.8rem] text-slate-400">
              Loading reports…
            </div>
          )}

          {!loading && error && (
            <div className="text-[0.8rem] text-rose-300">{error}</div>
          )}

          {!loading && !error && currentPageReports.length === 0 && (
            <div className="text-[0.8rem] text-slate-400">
              No reports match the current filters.
            </div>
          )}

          <div className="space-y-3">
            {currentPageReports.map((r) => (
              <article
                key={r.report_id}
                className="group rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 text-xs md:text-[0.8rem] hover:border-sky-400/60 hover:bg-slate-900/90 transition cursor-pointer"
                onClick={() => navigate(`/reports/${r.report_id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-slate-100 group-hover:text-sky-100">
                      {r.title}
                    </h3>
                    <p className="mt-1 text-[0.7rem] text-slate-400">
                      {r.area_name}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[0.65rem] text-slate-500">
                    {timeAgo(r.created_at)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem]">
                  <Tag label={r.category_name} tone="sky" />
                  <Tag label={r.current_status} tone="indigo" />
                  <SeverityPill level={r.severity_label} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ----- small subcomponents for pills/tags ----- */

function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 text-xs font-medium transition " +
        (active
          ? "bg-slate-100 text-slate-900 shadow-sm"
          : "border border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/70 hover:text-sky-200")
      }
    >
      {label}
    </button>
  );
}

function Tag({ label, tone }) {
  if (!label) return null;

  const toneClasses =
    tone === "sky"
      ? "border-sky-500/40 text-sky-200"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200"
      : "border-indigo-400/50 text-indigo-200";

  return (
    <span
      className={`rounded-full border bg-slate-950/80 px-2 py-0.5 ${toneClasses}`}
    >
      {label}
    </span>
  );
}

function SeverityPill({ level }) {
  if (!level) level = "Medium";
  const upper = level.toUpperCase();

  const conf =
    upper === "LOW"
      ? {
          text: "Low severity",
          classes:
            "border-emerald-500/50 text-emerald-200 bg-emerald-500/5",
        }
      : upper === "HIGH"
      ? {
          text: "High severity",
          classes: "border-rose-500/70 text-rose-200 bg-rose-500/10",
        }
      : {
          text: "Medium severity",
          classes: "border-amber-400/60 text-amber-200 bg-amber-400/10",
        };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${conf.classes}`}
    >
      {conf.text}
    </span>
  );
}
