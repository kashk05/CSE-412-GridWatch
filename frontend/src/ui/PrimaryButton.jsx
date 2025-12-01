// src/components/ui/PrimaryButton.jsx
import React from "react";

export default function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={
        "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/40 transition-transform hover:translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}
