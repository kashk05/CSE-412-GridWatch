// src/components/ui/Pill.jsx
import React from "react";

export default function Pill({ children, className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs text-slate-300 " +
        className
      }
    >
      {children}
    </span>
  );
}
