// src/pages/Reports.jsx
import React from "react";
import Card from "../ui/Card";

export default function Reports() {
  const reports = [
    {
      title: "Flickering streetlight near San Pablo",
      location: "San Pablo Ave & 10th St",
      tags: ["Lighting", "Public Works", "In Progress", "Medium severity"],
      time: "12 min ago",
    },
    {
      title: "Pothole causing lane merge issues",
      location: "Tooker House roundabout",
      tags: ["Roadway", "Transportation", "Open", "High severity"],
      time: "43 min ago",
    },
    {
      title: "Overflowing trash near bus stop",
      location: "Central Campus Transit Hub",
      tags: ["Sanitation", "City Services", "Queued", "Low severity"],
      time: "1 hr ago",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Page header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
              issue directory
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
              All Reports
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Browse and filter every issue logged in your grid. Use severity,
              status, and department to triage what matters first.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-slate-200 hover:border-teal-400/70 hover:text-teal-100">
              Filter • Last 24h
            </button>
            <button className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-slate-200 hover:border-teal-400/70 hover:text-teal-100">
              Export CSV
            </button>
          </div>
        </header>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center rounded-full border border-teal-400/70 bg-teal-500/15 px-3 py-1 text-teal-200">
            All grids
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-slate-300">
            High severity
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-slate-300">
            Open
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-slate-300">
            Breaching SLA
          </span>
          <button className="ml-auto text-xs text-slate-400 hover:text-teal-300">
            Reset filters
          </button>
        </div>

        {/* Reports list */}
        <Card className="divide-y divide-white/5">
          {reports.map((r, idx) => (
            <article
              key={idx}
              className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-100">
                  {r.title}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{r.location}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {r.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 md:w-32">
                {r.time}
              </div>
            </article>
          ))}
        </Card>
      </div>
    </div>
  );
}
