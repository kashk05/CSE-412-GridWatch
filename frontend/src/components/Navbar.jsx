// src/components/Navbar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

function TopNavLink({ to, exact = false, children }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        "px-4 py-1.5 rounded-full text-xs font-medium transition " +
        (isActive
          ? "bg-slate-100 text-slate-900 shadow-sm"
          : "text-slate-300 hover:text-sky-200 hover:bg-slate-800/80")
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-900 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        {/* LEFT: Logo + text */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 font-black shadow-lg">
            GW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-[0.18em] uppercase text-slate-300">
                GridWatch
              </span>
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-sky-300 border border-sky-500/30">
                CSE 412
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Civic Issue Reporting • NYC Grid
            </p>
          </div>
        </div>

        {/* CENTER: Pills (Dashboard / Reports / Departments / Analytics) */}
        <nav className="hidden items-center gap-1 rounded-full bg-slate-900/70 px-1 py-1 text-sm backdrop-blur md:flex border border-slate-800">
          <TopNavLink to="/" exact>
            Dashboard
          </TopNavLink>
          <TopNavLink to="/reports">Reports</TopNavLink>
          <TopNavLink to="/departments">Departments</TopNavLink>
          <TopNavLink to="/analytics">Analytics</TopNavLink>
        </nav>

        {/* RIGHT: Grid selector + admin badge (no hard-coded KK) */}
        <div className="flex items-center gap-3">
          <button className="hidden rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur md:inline-flex items-center gap-2">
            <span role="img" aria-label="globe">
              🌐
            </span>
            <span>NYC Grid</span>
          </button>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 text-[0.75rem] font-semibold text-slate-950 shadow-lg"
            title="Admin console demo (citizens only file & track reports)."
          >
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
