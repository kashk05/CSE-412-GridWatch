// src/components/ui/Card.jsx
import React from "react";

export default function Card({ className = "", children }) {
  return (
    <div
      className={
        "rounded-3xl border border-white/5 bg-slate-900/70 shadow-[0_24px_80px_rgba(15,23,42,0.85)] " +
        className
      }
    >
      {children}
    </div>
  );
}
