// src/pages/Analytics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getReports } from "../utils/api.js";

// same notion as Home.jsx
function isOpenStatus(status) {
  if (!status) return false;
  const s = String(status).toUpperCase();
  return !["RESOLVED", "CLOSED"].includes(s);
}

// crude SLA breach: open + older than 48h
function isBreaching(report) {
  if (!isOpenStatus(report.current_status) || !report.created_at) return false;
  const created = new Date(report.created_at).getTime();
  const diffMs = Date.now() - created;
  return diffMs > 48 * 60 * 60 * 1000;
}

export default function Analytics() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await getReports();
        if (!cancelled) {
          setReports(data || []);
          setError("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Failed to load analytics data from the API.");
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

  const analytics = useMemo(() => {
    const result = {
      total: 0,
      open: 0,
      closed: 0,
      highOpen: 0,
      breaching: 0,
      severityCounts: {}, // LOW / MEDIUM / HIGH / OTHER
      statusCounts: {},   // SUBMITTED / IN_PROGRESS / ...
      deptLoad: [],       // [{ name, openCount, highOpen, loadIndex }]
      dailyBuckets: [],   // [{ dateLabel, count }]
    };

    if (!reports || reports.length === 0) return result;

    result.total = reports.length;

    const severityCounts = new Map();
    const statusCounts = new Map();
    const deptBuckets = new Map();
    const dailyMap = new Map();

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    for (const r of reports) {
      const status = String(r.current_status || "UNKNOWN").toUpperCase();
      const sevRaw = String(r.severity_label || "UNKNOWN").toUpperCase();
      const sev =
        sevRaw.includes("HIGH")
          ? "HIGH"
          : sevRaw.includes("LOW")
          ? "LOW"
          : sevRaw.includes("MED")
          ? "MEDIUM"
          : "OTHER";

      // top-level counts
      const open = isOpenStatus(status);
      if (open) {
        result.open += 1;
      } else {
        result.closed += 1;
      }

      if (open && sev === "HIGH") {
        result.highOpen += 1;
      }

      if (isBreaching(r)) {
        result.breaching += 1;
      }

      // severity buckets
      severityCounts.set(sev, (severityCounts.get(sev) || 0) + 1);

      // status buckets
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

      // department load (only open reports)
      if (open) {
        const dept =
          r.department_name ||
          r.dept_name ||
          r.department ||
          "Unassigned";

        if (!deptBuckets.has(dept)) {
          deptBuckets.set(dept, {
            name: dept,
            openCount: 0,
            highOpen: 0,
            score: 0,
          });
        }
        const entry = deptBuckets.get(dept);
        entry.openCount += 1;

        const weight = sev === "HIGH" ? 3 : sev === "MEDIUM" ? 2 : 1;
        entry.score += weight;
        if (sev === "HIGH") entry.highOpen += 1;
      }

      // daily volume (last 30 days)
      if (r.created_at) {
        const ts = new Date(r.created_at).getTime();
        if (now - ts <= THIRTY_DAYS_MS) {
          const dayKey = new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD
          dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
        }
      }
    }

    // finalize severity
    result.severityCounts = Object.fromEntries(severityCounts);

    // finalize status (sorted by count desc)
    result.statusCounts = Object.fromEntries(
      Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1])
    );

    // finalize department load
    const deptArr = Array.from(deptBuckets.values());
    const maxScore =
      deptArr.length > 0
        ? Math.max(...deptArr.map((d) => d.score || 1))
        : 1;

    result.deptLoad = deptArr
      .map((d) => ({
        ...d,
        loadIndex: Math.round((d.score / maxScore) * 100),
      }))
      .sort((a, b) => b.loadIndex - a.loadIndex)
      .slice(0, 10); // top 10 departments

    // finalize daily buckets (chronological)
    const sortedDays = Array.from(dailyMap.entries()).sort((a, b) =>
      a[0] < b[0] ? -1 : 1
    );
    result.dailyBuckets = sortedDays.map(([dateLabel, count]) => ({
      dateLabel,
      count,
    }));

    return result;
  }, [reports]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6 lg:px-8">
        {/* PAGE HEADER */}
        <header className="mb-8">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Grid Insights
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50">
            Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Explore severity mix, status breakdown, department load, and
            recent activity based on live reports in the GridWatch database.
          </p>
        </header>

        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Loading analytics…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* TOP KPIs */}
            <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total reports"
                value={analytics.total}
                subtitle="All time in this grid"
              />
              <KpiCard
                label="Open reports"
                value={analytics.open}
                subtitle={`${analytics.closed} resolved/closed`}
              />
              <KpiCard
                label="High-severity open"
                value={analytics.highOpen}
                subtitle="High impact in queue"
              />
              <KpiCard
                label="Breaching SLA (approx.)"
                value={analytics.breaching}
                subtitle="Open > 48 hours"
                tone="critical"
              />
            </section>

            {/* MAIN GRID: charts */}
            <section className="grid gap-6 lg:grid-cols-3">
              {/* left column: severity + status */}
              <div className="space-y-6 lg:col-span-2">
                <SeverityMixCard counts={analytics.severityCounts} />
                <StatusBreakdownCard counts={analytics.statusCounts} />
              </div>

              {/* right column: recent volume */}
              <div>
                <DailyVolumeCard buckets={analytics.dailyBuckets} />
              </div>

              {/* full-width: department load */}
              <div className="lg:col-span-3">
                <DepartmentLoadCard depts={analytics.deptLoad} />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function KpiCard({ label, value, subtitle, tone }) {
  const borderClass =
    tone === "critical"
      ? "border-rose-500/40"
      : "border-slate-800";

  const badgeClass =
    tone === "critical"
      ? "bg-rose-500/10 text-rose-200 border border-rose-500/50"
      : "bg-emerald-500/10 text-emerald-200 border border-emerald-500/40";

  return (
    <div
      className={`rounded-2xl border ${borderClass} bg-slate-950/80 p-4 shadow-lg`}
    >
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-50">
        {value ?? 0}
      </p>
      <p className="mt-1 text-[0.75rem] text-slate-400">{subtitle}</p>
      {tone === "critical" && (
        <span className={`mt-3 inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] ${badgeClass}`}>
          ⚠ Heavy backlog risk
        </span>
      )}
    </div>
  );
}

function SeverityMixCard({ counts }) {
  const entries = Object.entries(counts || {});
  const total = entries.reduce((sum, [, c]) => sum + c, 0) || 1;

  const palette = {
    HIGH: "bg-rose-500",
    MEDIUM: "bg-amber-400",
    LOW: "bg-emerald-400",
    OTHER: "bg-slate-500",
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Severity mix
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            Distribution of reports by severity level.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-[0.75rem] text-slate-400">
          No data yet. File some reports to see severity distribution.
        </p>
      ) : (
        <>
          {/* stacked bar */}
          <div className="mb-4 h-4 w-full overflow-hidden rounded-full bg-slate-900">
            <div className="flex h-full w-full">
              {entries.map(([sev, count]) => {
                const pct = (count / total) * 100;
                return (
                  <div
                    key={sev}
                    className={`${palette[sev] || palette.OTHER} h-full`}
                    style={{ width: `${pct}%` }}
                    title={`${sev} • ${count} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
          </div>

          {/* legend */}
          <div className="grid gap-3 text-[0.75rem] md:grid-cols-4">
            {entries.map(([sev, count]) => {
              const pct = (count / total) * 100;
              return (
                <div key={sev} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      palette[sev] || palette.OTHER
                    }`}
                  />
                  <div>
                    <p className="font-medium text-slate-100">
                      {sev.charAt(0) + sev.slice(1).toLowerCase()}
                    </p>
                    <p className="text-[0.7rem] text-slate-400">
                      {count} ({pct.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBreakdownCard({ counts }) {
  const entries = Object.entries(counts || {});
  const max = entries.reduce((m, [, c]) => Math.max(m, c), 0) || 1;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Status breakdown
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            Where reports are in the lifecycle.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-[0.75rem] text-slate-400">
          No status data yet.
        </p>
      ) : (
        <div className="space-y-3 text-[0.75rem]">
          {entries.map(([status, count]) => {
            const width = (count / max) * 100;
            return (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-100">
                    {status.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-400">{count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DepartmentLoadCard({ depts }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Department load
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            Which teams are carrying the heaviest queue right now.
          </p>
        </div>
      </div>

      {(!depts || depts.length === 0) ? (
        <p className="text-[0.75rem] text-slate-400">
          No open reports yet, so department load is clear.
        </p>
      ) : (
        <div className="space-y-3 text-[0.75rem]">
          {depts.map((d) => (
            <div
              key={d.name}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-100">{d.name}</p>
                  <p className="text-[0.7rem] text-slate-400">
                    {d.openCount} open • {d.highOpen} high-severity
                  </p>
                </div>
                <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[0.65rem] text-slate-300 border border-slate-700">
                  Load {d.loadIndex}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400"
                    style={{ width: `${d.loadIndex}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyVolumeCard({ buckets }) {
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0) || 1;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Daily volume (last 30 days)
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            How many reports are being filed each day.
          </p>
        </div>
      </div>

      {(!buckets || buckets.length === 0) ? (
        <p className="text-[0.75rem] text-slate-400">
          No reports in the last 30 days.
        </p>
      ) : (
        <div className="flex h-32 items-end gap-[3px] rounded-2xl bg-slate-900/70 p-3">
          {buckets.map((b) => {
            const height = (b.count / max) * 100;
            return (
              <div
                key={b.dateLabel}
                className="group flex-1 rounded-t-full bg-gradient-to-t from-sky-500/50 via-teal-400/70 to-emerald-300/80"
                style={{ height: `${height}%` }}
                title={`${b.dateLabel}: ${b.count} report(s)`}
              >
                {/* tiny hover tooltip via title; no extra DOM needed */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
