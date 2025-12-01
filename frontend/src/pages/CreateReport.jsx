// src/pages/CreateReport.jsx
import React, { useState } from "react";
import Card from "../ui/Card.jsx";
import { createReport } from "../utils/api.js";
import { useNavigate } from "react-router-dom";

/**
 * Static fallback options so the form does NOT rely on /refdata APIs.
 * Make sure these ids line up with your real DB seed data.
 */

const CATEGORY_OPTIONS = [
  { id: 1, name: "Lighting" },
  { id: 2, name: "Roadway" },
  { id: 3, name: "Sanitation" },
  { id: 4, name: "Noise" },
  { id: 5, name: "Other" },
];

const SEVERITY_OPTIONS = [
  { id: 1, label: "Low" },
  { id: 2, label: "Medium" },
  { id: 3, label: "High" },
  { id: 4, label: "Critical" },
];

const DEPARTMENT_OPTIONS = [
  { id: 1, name: "Transportation" },
  { id: 2, name: "Public Works" },
  { id: 3, name: "Sanitation Department" },
  { id: 4, name: "Parks & Recreation" },
];

const SERVICE_AREA_OPTIONS = [
  { id: 1, name: "Manhattan" },
  { id: 2, name: "Brooklyn" },
  { id: 3, name: "Queens" },
  { id: 4, name: "Bronx" },
  { id: 5, name: "Staten Island" },
  { id: 6, name: "Other" },
];

// TEMP: until you have auth, just use a fixed user id
const CREATED_BY_PLACEHOLDER_ID = 1;

export default function CreateReport() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState(""); // mapped to "address" on backend
  const [description, setDescription] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [severityId, setSeverityId] = useState("");
  const [departmentId, setDepartmentId] = useState(""); // UI only, not sent yet
  const [areaId, setAreaId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  function getRandomNYCCoords() {
  const latMin = 40.4774;
  const latMax = 40.9176;
  const lonMin = -74.2591;
  const lonMax = -73.7004;

  const latitude  = latMin + Math.random() * (latMax - latMin);
  const longitude = lonMin + Math.random() * (lonMax - lonMin);

  return { latitude, longitude };
  }


  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // basic required-field guard rails
    if (!title.trim() || !location.trim() || !description.trim()) {
      setErrorMsg("Title, location, and description are required.");
      return;
    }
    if (!categoryId || !severityId || !areaId) {
      setErrorMsg("Category, severity, and service area are required.");
      return;
    }

    /**
     * IMPORTANT: match backend ReportCreate exactly:
     *   title, description, address, category_id, severity_id, area_id, created_by
     *   (latitude/longitude left as null for now)
     */
const { latitude, longitude } = getRandomNYCCoords();

const payload = {
  title: title.trim(),
  description: description.trim(),
  address: location.trim(),

  // backend naming
  latitude,
  longitude,

  category_id: Number(categoryId),
  severity_id: Number(severityId),
  area_id: Number(areaId),

  created_by: CREATED_BY_PLACEHOLDER_ID,
};

    try {
      setSubmitting(true);
      const created = await createReport(payload);

      setSuccessMsg(
        `Report "${created?.title ?? title.trim()}" was submitted successfully.`
      );

      // clear form fields
      setTitle("");
      setLocation("");
      setDescription("");
      setCategoryId("");
      setSeverityId("");
      setDepartmentId("");
      setAreaId("");

      // after a short delay, go back to the reports timeline
      setTimeout(() => navigate("/reports"), 2200);
    } catch (err) {
      console.error("createReport error:", err);
      setErrorMsg(
        "Something went wrong while submitting your report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        {/* Header */}
        <header>
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
            new issue
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50">
            File a New Report
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl">
            Describe what&apos;s happening, where, and how severe it is so the
            right department can jump on it.
          </p>
        </header>

        {/* Success / error banners just above the card */}
        {successMsg && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            ✅ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            ⚠ {errorMsg}
          </div>
        )}

        {/* Form card */}
        <Card className="p-6 md:p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Title + Category */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                  placeholder="Streetlight flickering near San Pablo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Category
                </label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location (mapped to address) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Location
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                placeholder="San Pablo Ave & 10th St"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Severity + Department (dept is only UI for now) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Severity
                </label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                  value={severityId}
                  onChange={(e) => setSeverityId(e.target.value)}
                >
                  <option value="">Select Severity</option>
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Department
                </label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Service area */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Service area
              </label>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
              >
                <option value="">Select Area</option>
                {SERVICE_AREA_OPTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Description
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                placeholder="Describe what’s happening and why it matters…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-white/15 bg-slate-900/80 px-5 py-2 text-sm text-slate-300 hover:border-slate-400/60"
                onClick={() => navigate("/reports")}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/40 hover:shadow-xl disabled:opacity-70"
              >
                <span>{submitting ? "Submitting…" : "Submit Report"}</span>
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
