// src/pages/Departments.jsx
import React from "react";
import Card from "../ui/Card";

export default function Departments() {
  const departments = [
    {
      name: "Public Works",
      load: 82,
      delta: "+6%",
      desc: "Streetlights, sidewalks, utilities, and road maintenance.",
    },
    {
      name: "Transportation",
      load: 64,
      delta: "+1%",
      desc: "Signals, lane closures, transit infrastructure.",
    },
    {
      name: "Parks & Rec",
      load: 27,
      delta: "-3%",
      desc: "Parks, playgrounds, and rec facilities.",
    },
    {
      name: "City Services",
      load: 55,
      delta: "+2%",
      desc: "Waste, sanitation, and city service requests.",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
              department load
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
              Departments
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              See which teams are under pressure, how many reports are in each
              queue, and where the grid is feeling the most strain.
            </p>
          </div>
        </header>

        {/* Grid of department cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {departments.map((dept) => (
            <Card key={dept.name} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold">{dept.name}</h2>
                  <p className="mt-1 text-xs text-slate-400">{dept.desc}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  {dept.delta}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Queue load</span>
                  <span>{dept.load}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400"
                    style={{ width: `${Math.min(dept.load, 100)}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
