// src/pages/ReportDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getReport,
  getStatuses,
  updateReportStatus,
  deleteReport,
} from "../utils/api.js";

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statuses, setStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);

  const [banner, setBanner] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [detail, statusList] = await Promise.all([
          getReport(id),
          getStatuses(),
        ]);
        if (!cancelled) {
          setReport(detail);
          setStatuses(statusList || []);
          setNewStatus(detail.current_status || "");
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to load report details from the API.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleStatusChange(e) {
    e.preventDefault();
    if (!newStatus) return;

    try {
      setChangingStatus(true);
      setBanner("");

      await updateReportStatus(Number(id), {
        new_status: newStatus,
        note: statusNote || null,
        changed_by: 1, // TODO: plug in real user id when you have auth
      });

      // re-fetch updated detail
      const updated = await getReport(id);
      setReport(updated);
      setStatusNote("");
      setBanner("Status updated successfully.");
    } catch (err) {
      console.error(err);
      setBanner("Failed to update status. Please try again.");
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      "Are you sure you want to delete this report? This cannot be undone."
    );
    if (!ok) return;

    try {
      await deleteReport(Number(id));
      navigate("/reports");
    } catch (err) {
      console.error(err);
      setBanner("Failed to delete report. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading report…</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <p className="text-sm text-rose-300">{error || "Report not found."}</p>
          <Link
            to="/reports"
            className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-xs text-slate-200"
          >
            ← Back to reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              report detail
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">
              {report.title}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              ID #{report.report_id} • {report.current_status}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="rounded-full border border-rose-500/70 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-100 hover:bg-rose-500/20"
          >
            Delete report
          </button>
        </div>

        {banner && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-xs text-slate-100">
            {banner}
          </div>
        )}

        {/* Top layout: left = core info, right = status change form */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* LEFT: core info + status history */}
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-2">
              Report info
            </h2>

            <dl className="grid gap-3 text-xs md:text-[0.8rem]">
              <div>
                <dt className="text-slate-400">Category</dt>
                <dd className="text-slate-100">{report.category?.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Severity</dt>
                <dd className="text-slate-100">
                  {report.severity?.label} (weight {report.severity?.weight})
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Service area</dt>
                <dd className="text-slate-100">
                  {report.service_area?.name}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Address</dt>
                <dd className="text-slate-100">
                  {report.address || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Coordinates</dt>
                <dd className="text-slate-100">
                  {report.latitude && report.longitude
                    ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
                    : "—"}
                </dd>
              </div>
              <div className="col-span-full">
                <dt className="text-slate-400 mb-1">Description</dt>
                <dd className="whitespace-pre-line text-slate-100">
                  {report.description || "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-slate-800 pt-4">
              <h3 className="text-xs font-semibold text-slate-200 mb-2">
                Status history
              </h3>
              {report.status_history && report.status_history.length > 0 ? (
                <ol className="space-y-2 text-xs">
                  {report.status_history.map((entry) => (
                    <li
                      key={entry.status_id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-slate-100">
                          {entry.status}
                        </p>
                        {entry.note && (
                          <p className="text-[0.7rem] text-slate-400">
                            {entry.note}
                          </p>
                        )}
                      </div>
                      <p className="text-[0.65rem] text-slate-500 whitespace-nowrap">
                        {new Date(entry.changed_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[0.75rem] text-slate-500">
                  No status changes recorded yet.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: Change status form */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-1">
              Change status
            </h2>
            <p className="text-[0.7rem] text-slate-400 mb-4">
              Update this report&apos;s lifecycle and optionally add a note for
              departments.
            </p>

            <form className="space-y-4" onSubmit={handleStatusChange}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  New status
                </label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">Select status</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Note (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none ring-teal-400/40 focus:border-teal-400 focus:ring-2"
                  placeholder="Eg. Routed to night crew; awaiting spare part."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={changingStatus || !newStatus}
                className="w-full rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-teal-500/40 hover:shadow-xl disabled:opacity-70"
              >
                {changingStatus ? "Updating…" : "Update status"}
              </button>
            </form>
          </div>
        </div>

        <div className="pt-2">
          <Link
            to="/reports"
            className="text-[0.75rem] text-sky-300 hover:text-sky-200"
          >
            ← Back to all reports
          </Link>
        </div>
      </div>
    </div>
  );
}
