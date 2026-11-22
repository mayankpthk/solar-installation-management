"use client";

import * as React from "react";

interface ServiceTicketChartProps {
  data?: {
    status: string;
    count: number;
    color: string;
  }[];
  isLoading?: boolean;
}

export function ServiceTicketChart({ data = [], isLoading }: ServiceTicketChartProps) {
  if (isLoading || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg animate-pulse">
        <span className="text-xs text-slate-400">Loading service ticket distribution...</span>
      </div>
    );
  }

  const total = Math.max(1, data.reduce((acc, d) => acc + d.count, 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Active & Historical Support Load</span>
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{total} Total Tickets</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center"
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase">{item.status}</p>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {item.count}
            </p>
            <span
              className="inline-block w-8 h-1 rounded-full mt-2"
              style={{ backgroundColor: item.color }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
