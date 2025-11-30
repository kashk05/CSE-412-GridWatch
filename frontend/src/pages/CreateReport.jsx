// src/pages/CreateReport.jsx
import React from "react";
import Card from "../ui/Card.jsx";

export default function CreateReport() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
            new issue
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
            File a New Report
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl">
            Describe what&apos;s happening, where, and how severe it is so the
            right department can jump on it.
          </p>
        </header>

        {/* Form card */}
        <Card className="p-6 md:p-8">
          <form className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                  placeholder="Streetlight flickering near San Pablo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Category
                </label>
                <select className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2">
                  <option>Lighting</option>
                  <option>Roadway</option>
                  <option>Sanitation</option>
                  <option>Noise</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Location
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                placeholder="San Pablo Ave & 10th St"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Severity
                </label>
                <select className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Department
                </label>
                <select className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2">
                  <option>Public Works</option>
                  <option>Transportation</option>
                  <option>City Services</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Description
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                placeholder="Describe what’s happening and why it matters…"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-white/15 bg-slate-900/80 px-5 py-2 text-sm text-slate-300 hover:border-slate-400/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/40 hover:shadow-xl"
              >
                <span>Submit Report</span>
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
