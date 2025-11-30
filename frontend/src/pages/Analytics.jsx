// src/pages/Analytics.jsx
import React from "react";

export default function Analytics() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <header>
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
            grid insights
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
            Analytics (coming online)
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl">
            This view will show severity mix, status breakdown, and department
            load based on live reports from the database.
          </p>
        </header>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300">
          <p>
            For now this is a placeholder. Once the backend exposes stats (or
            we aggregate from <code>/reports</code> on the frontend), we’ll drop
            in charts here.
          </p>
        </div>
      </div>
    </div>
  );
}
