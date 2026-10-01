"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export function ExportActivityForm() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(
    new Date().getTime() - 30 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const href = `/api/export/activity?from=${from}&to=${to}`;

  return (
    <div className="rounded-3xl border-4 border-slate-200 bg-white p-5 shadow-[0_4px_0_#e2e8f0]">
      <h3 className="font-black text-slate-700 mb-1">Export activity</h3>
      <p className="text-sm text-slate-500 font-medium mb-4">
        Download a CSV of all family activity for any date range.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:border-violet-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
          To
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:border-violet-400"
          />
        </label>
        <a
          href={href}
          download
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </a>
      </div>
    </div>
  );
}
