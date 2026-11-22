"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";

interface TechnicianPerformanceChartProps {
  data?: {
    name: string;
    jobsCompleted: number;
    hours: number;
    hourlyRate: number;
  }[];
  isLoading?: boolean;
}

export function TechnicianPerformanceChart({ data = [], isLoading }: TechnicianPerformanceChartProps) {
  if (isLoading || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg animate-pulse">
        <span className="text-xs text-slate-400">Loading technician performance...</span>
      </div>
    );
  }

  const maxJobs = Math.max(...data.map((d) => d.jobsCompleted), 1);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {data.map((tech, idx) => {
          const widthPct = (tech.jobsCompleted / maxJobs) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{tech.name}</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {tech.jobsCompleted} installs • {tech.hours} hrs ({formatCurrency(tech.hourlyRate)}/hr)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
