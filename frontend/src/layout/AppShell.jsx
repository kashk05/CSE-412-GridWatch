// src/layout/AppShell.jsx
import React from "react";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Reports", to: "/reports" },
  { label: "Departments", to: "/departments" },
  { label: "Analytics", to: "/analytics" },
];

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Left: logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-teal-400 to-sky-500 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/30">
              GW
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">
                GRIDWATCH
              </span>
              <span className="text-xs text-slate-400">
                Civic Issue Reporting · CSE 412
              </span>
            </div>
          </Link>

          {/* Center: nav tabs */}
          <nav className="hidden gap-2 rounded-full bg-slate-900/70 p-1 text-xs font-medium text-slate-300 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "px-4 py-1.5 rounded-full transition-all",
                    isActive
                      ? "bg-slate-100 text-slate-900 shadow-md shadow-teal-500/20"
                      : "hover:bg-slate-800/80 hover:text-slate-50",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: grid switcher + user pill */}
          <div className="flex items-center gap-3 text-xs">
            <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-slate-200 hover:border-teal-400/60 hover:text-teal-100">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                🌐
              </span>
              <span>Tempe Grid</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-teal-400 text-xs font-semibold text-slate-950">
              KK
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
