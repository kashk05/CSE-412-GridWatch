// src/pages/Home.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getReports } from "../utils/api.js";

// helper: rough "x min ago"
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

export default function Home() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
        if (!cancelled) {
          console.error(err);
          setError("Failed to load latest reports from the API.");
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

  const stats = useMemo(() => {
    const now = Date.now();

    const last24 = reports.filter((r) => {
      if (!r.created_at) return false;
      const t = new Date(r.created_at).getTime();
      return now - t <= 24 * 60 * 60 * 1000;
    });

    const newReports = last24.length;

    const highSeverity = reports.filter((r) =>
      (r.severity_label || "").toUpperCase().includes("HIGH")
    ).length;

    const breaching = reports.filter(isBreaching).length;

    const resolved24 = last24.filter((r) =>
      ["RESOLVED", "CLOSED"].includes(
        (r.current_status || "").toUpperCase()
      )
    ).length;

    return {
      newReports,
      highSeverity,
      breaching,
      resolved24,
    };
  }, [reports]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top Glow Background */}
      <div className="pointer-events-none fixed inset-x-0 -top-40 z-0 flex justify-center opacity-60">
        <div className="h-72 w-[40rem] bg-gradient-to-b from-sky-500/50 via-teal-400/30 to-transparent blur-3xl" />
      </div>

      {/* Page Shell (Navbar already rendered above from App.jsx) */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-6 md:px-6 lg:px-8">
        {/* HERO + METRICS */}
        <section className="mb-8">
          <HeroSection />
        </section>

        {/* LOWER GRID */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Live city status card (uses real stats) */}
          <div className="lg:col-span-1">
            <LiveStatusCard loading={loading} stats={stats} />
          </div>

          {/* Latest reports list (uses real reports) */}
          <div className="lg:col-span-2">
            <LatestReports
              reports={reports}
              loading={loading}
              error={error}
              onViewTimeline={() => navigate("/reports")}
            />
          </div>

          {/* Service area load (derived from reports) */}
          <div className="lg:col-span-2 order-3 lg:order-3">
            <DepartmentsLoad reports={reports} />
          </div>

{/* Lightweight activity feed (now derived from live reports) */}
<div className="lg:col-span-1 order-2 lg:order-4">
  <ActivityFeed reports={reports} />
</div>

        </section>
      </div>
    </div>
  );
}

/* ----------------- Subcomponents ----------------- */

function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden rounded-[2.2rem] border border-slate-800 bg-slate-950 shadow-2xl p-8 md:p-10 lg:p-12">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/25 via-emerald-400/18 to-indigo-600/25 opacity-90" />

      {/* Soft glows */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-80 w-80 rounded-full bg-sky-500/40 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-80 w-80 rounded-full bg-emerald-400/35 blur-[120px]" />

      {/* Abstract lines */}
      <div className="pointer-events-none absolute inset-0">
        <svg
          className="absolute inset-0 h-full w-full opacity-25"
          viewBox="0 0 800 450"
          fill="none"
        >
          <path
            d="M-40 400C120 260 260 220 430 250C600 280 720 240 860 120"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="0.8"
          />
          <circle
            cx="540"
            cy="120"
            r="220"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.7"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        {/* LEFT COPY */}
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-200/80">
            Real-time Civic Intelligence
          </p>

<h1 className="text-[3.6rem] md:text-[4.5rem] font-bold leading-[1.05] tracking-tight">
  <span className="block text-slate-50">GridWatch</span>
  <span className="block text-slate-50">keeps your city</span>
  <span className="block text-teal-300">grid alive</span>
</h1>


          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300 font-medium">
            Track, prioritize, and resolve urban issues across NYC service
            areas. Residents file reports; GridWatch turns them into
            actionable signals with live severity and department load.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/reports/new"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:opacity-95"
            >
              ⚡ File a New Report
            </Link>

            <Link
              to="/reports"
              className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/60 px-5 py-2.5 text-sm font-medium text-slate-100 backdrop-blur hover:border-sky-300/80 hover:text-sky-100"
            >
              View All Reports
              <span className="text-slate-400">↗</span>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-6 text-xs text-slate-200/80">
            <FeaturePill label="Smart Severity Scoring" />
            <FeaturePill label="Cross-Dept Routing" />
            <FeaturePill label="Live SLA Tracking" />
          </div>
        </div>

        {/* RIGHT METRICS GRID (still static hero copy) */}
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <MetricCard
            label="Issues logged"
            value="192k"
            accent="from-sky-300 to-teal-200"
            subtitle="Across all service areas"
          />
          <MetricCard
            label="Active departments"
            value="34"
            accent="from-emerald-300 to-sky-200"
            subtitle="Responding in this grid"
          />
          <MetricCard
            label="Median response time"
            value="8 min"
            accent="from-teal-300 to-emerald-200"
            subtitle="From report to acknowledgement"
          />
          <MetricCard
            label="Resolution rate"
            value="99%"
            accent="from-indigo-300 to-sky-200"
            subtitle="Closed within SLA window"
          />
        </div>
      </div>
    </section>
  );
}

function FeaturePill({ label }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-600/80 bg-slate-900/80 px-3 py-1 backdrop-blur text-[0.7rem]">
      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
      <span>{label}</span>
    </div>
  );
}

function MetricCard({ label, value, accent, subtitle }) {
  return (
    <div className="relative flex h-32 flex-col justify-between overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/70 p-4 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.8)]">
      <div
        className={`pointer-events-none absolute inset-x-0 -top-10 h-20 bg-gradient-to-r ${accent} opacity-40 blur-2xl`}
      />
      <div className="relative flex items-center justify-between">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-300/90">
          {label}
        </p>
        <span className="text-[0.65rem] rounded-full bg-slate-900/80 px-2 py-0.5 text-slate-400 border border-slate-700/70">
          Live
        </span>
      </div>
      <div className="relative">
        <p className="text-3xl font-semibold text-slate-50">{value}</p>
        <p className="mt-1 text-[0.7rem] text-slate-300/85">{subtitle}</p>
      </div>
    </div>
  );
}

function LiveStatusCard({ loading, stats }) {
  const { newReports, highSeverity, breaching, resolved24 } = stats;

  return (
    <div className="h-full rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Live City Status
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            Snapshot of the grid in the last 24 hours.
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-300 border border-emerald-400/40">
          {breaching > 0 ? "Under strain" : "Stable"}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-xs">
        <StatusRow
          label="New reports"
          value={loading ? "…" : newReports}
          accent="bg-sky-400/80"
        />
        <StatusRow
          label="High severity"
          value={loading ? "…" : highSeverity}
          accent="bg-amber-400/90"
        />
        <StatusRow
          label="Breaching SLA (approx.)"
          value={loading ? "…" : breaching}
          accent="bg-rose-500/90"
        />
        <StatusRow
          label="Resolved in last 24h"
          value={loading ? "…" : resolved24}
          accent="bg-emerald-400/90"
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-[0.7rem] text-slate-300/90">
        <p className="mb-1 font-medium text-slate-100">
          🛰 Smart routing online
        </p>
        <p>
          Reports are auto-routed to departments based on category, location,
          and current queue load.
        </p>
      </div>
    </div>
  );
}

function StatusRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accent}`} />
        <span className="text-slate-300">{label}</span>
      </div>
      <span className="font-semibold text-slate-50">{value}</span>
    </div>
  );
}

function LatestReports({ reports, loading, error, onViewTimeline }) {
  const latest = reports.slice(0, 3);

  return (
    <div className="h-full rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Latest Reports
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            Live feed of what residents are flagging in the grid.
          </p>
        </div>
        <button className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[0.7rem] text-slate-200">
          Last 24h
        </button>
      </div>

      {loading && (
        <div className="text-[0.75rem] text-slate-400">Loading reports…</div>
      )}

      {!loading && error && (
        <div className="text-[0.75rem] text-rose-300">{error}</div>
      )}

      {!loading && !error && latest.length === 0 && (
        <div className="text-[0.75rem] text-slate-400">
          No reports yet. Be the first to file one.
        </div>
      )}

      <div className="space-y-3">
        {latest.map((r) => (
          <article
            key={r.report_id}
            className="group rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 text-xs md:text-[0.8rem] hover:border-sky-400/60 hover:bg-slate-900/90 transition"
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
              <Tag label={r.area_name} tone="emerald" />
              <Tag label={r.current_status} tone="indigo" />
              <SeverityPill level={r.severity_label} />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-[0.7rem] text-slate-400">
        <span>Showing last {latest.length} reports.</span>
        <button
          className="text-sky-300 hover:text-sky-200"
          onClick={onViewTimeline}
        >
          View full timeline ↗
        </button>
      </div>
    </div>
  );
}

function Tag({ label, tone }) {
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
  if (!level) level = "MEDIUM";
  const upper = level.toUpperCase();

  const conf =
    upper === "LOW"
      ? {
          text: "Low",
          classes: "border-emerald-500/50 text-emerald-200 bg-emerald-500/5",
        }
      : upper === "HIGH"
      ? {
          text: "High",
          classes: "border-rose-500/70 text-rose-200 bg-rose-500/10",
        }
      : {
          text: "Medium",
          classes: "border-amber-400/60 text-amber-200 bg-amber-400/10",
        };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${conf.classes}`}
    >
      {conf.text} severity
    </span>
  );
}

function DepartmentsLoad({ reports }) {
  // derive per-area live load from real reports
  const areas = useMemo(() => {
    const buckets = new Map();

    reports.forEach((r) => {
      const name = r.area_name || r.service_area_name || "Unassigned";

      if (!buckets.has(name)) {
        buckets.set(name, {
          name,
          openScore: 0,    // severity-weighted score
          openCount: 0,
        });
      }

      const entry = buckets.get(name);

      if (!isOpenStatus(r.current_status)) {
        return;
      }

      const sev = String(r.severity_label || "").toUpperCase();
      const weight = sev.includes("HIGH")
        ? 3
        : sev.includes("LOW")
        ? 1
        : 2; // MEDIUM / unknown

      entry.openScore += weight;
      entry.openCount += 1;
    });

    const rows = Array.from(buckets.values());

    if (rows.length === 0) return [];

    // scale so busiest area = 100, others relative
    const maxScore = Math.max(...rows.map((r) => (r.openScore || 1)));

    return rows
      .map((r) => ({
        ...r,
        loadIndex: Math.round((r.openScore / maxScore) * 100),
      }))
      // busiest first
      .sort((a, b) => b.loadIndex - a.loadIndex)
      // show top 12 areas on the dashboard
      .slice(0, 12);
  }, [reports]);

  return (
    <div className="h-full rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Service Area Load
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            Severity-weighted queue pressure across NYC service areas.
          </p>
        </div>
        <span className="rounded-full bg-slate-900/70 px-3 py-1 text-[0.7rem] text-slate-300 border border-slate-700">
          Load index • 0–100
        </span>
      </div>

      {areas.length === 0 ? (
        <p className="text-[0.75rem] text-slate-400">
          No live reports yet. File some issues to see area load.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {areas.map((area) => (
            <div
              key={area.name}
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-100">{area.name}</p>
                <span className="text-[0.65rem] text-emerald-300">
                  live
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400"
                    style={{ width: `${area.loadIndex}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[0.7rem] text-slate-100">
                  {area.loadIndex}
                </span>
              </div>

              <p className="mt-1 text-[0.65rem] text-slate-400">
                Derived from {area.openCount} open report
                {area.openCount === 1 ? "" : "s"} in this area.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityFeed({ reports }) {
  const events = React.useMemo(() => {
    if (!Array.isArray(reports) || reports.length === 0) return [];

    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;

    // newest reports first
    const sorted = [...reports].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    // prefer events from the last 60 minutes; if none, fall back to newest overall
    const recent = sorted.filter((r) => {
      if (!r.created_at) return false;
      const t = new Date(r.created_at).getTime();
      return now - t <= ONE_HOUR_MS;
    });

    const base = (recent.length ? recent : sorted).slice(0, 9);

    return base.map((r) => {
      let label;
      if (isBreaching(r)) {
        label = "SLA warning";
      } else if (!isOpenStatus(r.current_status)) {
        label = "Resolution";
      } else {
        label = "New report filed";
      }

      const area = r.area_name || "this area";
      const sev = (r.severity_label || "").toLowerCase();

      let detail;
      if (label === "SLA warning") {
        detail = `${r.title} in ${area} is breaching its SLA.`;
      } else if (label === "Resolution") {
        detail = `${r.title} in ${area} has been resolved.`;
      } else {
        detail = `${r.title} reported in ${area}${
          sev ? ` (${sev} severity)` : ""
        }.`;
      }

      return {
        id: r.report_id,
        label,
        detail,
        time: timeAgo(r.created_at),
      };
    });
  }, [reports]);

  return (
    <div className="h-full rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">
          Activity Pulse
        </h2>
        <span className="text-[0.65rem] text-slate-400">
          Last 60 minutes
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-[0.75rem] text-slate-400">
          No recent activity in the last hour.
        </p>
      ) : (
        <ol className="relative border-l border-slate-800/80 pl-3 text-xs space-y-3">
          {events.map((item) => (
            <li key={item.id} className="relative pl-2">
              <span className="absolute -left-[9px] mt-1 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 shadow-md" />
              <p className="font-medium text-slate-100">{item.label}</p>
              <p className="text-[0.7rem] text-slate-400">{item.detail}</p>
              <p className="mt-0.5 text-[0.65rem] text-slate-500">
                {item.time}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
