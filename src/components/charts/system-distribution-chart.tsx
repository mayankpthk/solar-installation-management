"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";

interface SystemDistributionChartProps {
  data?: {
    name: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  isLoading?: boolean;
}

export function SystemDistributionChart({ data = [], isLoading }: SystemDistributionChartProps) {
  if (isLoading || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg animate-pulse">
        <span className="text-xs text-slate-400">Loading system distribution...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visual Stacked Bar representing proportion */}
      <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner">
        {data.map((item, idx) => (
          <div
            key={idx}
            style={{ width: `${item.percentage}%` }}
            className={`${idx === 0 ? "bg-emerald-500" : "bg-blue-600"} hover:opacity-90 transition-opacity`}
            title={`${item.name}: ${item.percentage}%`}
          />
        ))}
      </div>

      {/* Legend & Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
          >
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${idx === 0 ? "bg-emerald-500" : "bg-blue-600"}`} />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                {item.count} <span className="text-xs font-normal text-slate-500">sites</span>
              </p>
              <p className="text-xs font-bold text-emerald-600 font-mono">{item.percentage}%</p>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{formatCurrency(item.revenue)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
