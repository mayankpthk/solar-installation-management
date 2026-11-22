"use client";

import * as React from "react";

interface LeadFunnelChartProps {
  data?: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  isLoading?: boolean;
  error?: string | null;
}

export function LeadFunnelChart({ data = [], isLoading, error }: LeadFunnelChartProps) {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg animate-pulse">
        <span className="text-xs text-slate-400">Loading conversion funnel...</span>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
        <span className="text-xs text-slate-400">No lead funnel data available.</span>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Inquiry to Customer Order Conversion Stages</span>
        <span className="font-semibold text-emerald-600">Overall Win Rate: 44.7%</span>
      </div>

      <div className="space-y-2">
        {data.map((stage, idx) => {
          const widthPercent = Math.max(12, (stage.count / maxCount) * 100);

          // Color gradient from blue (new) to solar green (won)
          const colors = [
            "bg-blue-600",
            "bg-blue-500",
            "bg-cyan-500",
            "bg-teal-500",
            "bg-emerald-500",
            "bg-emerald-600",
          ];
          const barColor = colors[idx % colors.length];

          return (
            <div key={idx} className="group relative">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">{stage.stage}</span>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{stage.count} leads</span>
                  <span className="text-slate-400">({stage.percentage}%)</span>
                </div>
              </div>

              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-500 group-hover:brightness-110`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
