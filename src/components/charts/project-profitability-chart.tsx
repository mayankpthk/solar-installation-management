"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";
import { StatusPill } from "@/components/shared/status-pill";

interface ProjectProfitabilityChartProps {
  data?: {
    orderNo: string;
    customer: string;
    capacity: string;
    revenue: number;
    directCost: number;
    grossProfit: number;
    marginPercent: number;
    status: string;
  }[];
  isLoading?: boolean;
}

export function ProjectProfitabilityChart({ data = [], isLoading }: ProjectProfitabilityChartProps) {
  if (isLoading || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg animate-pulse">
        <span className="text-xs text-slate-400">Loading profitability analysis...</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="py-2.5 px-3">Order / Customer</th>
            <th className="py-2.5 px-3">System</th>
            <th className="py-2.5 px-3 text-right">Revenue</th>
            <th className="py-2.5 px-3 text-right">Direct Cost</th>
            <th className="py-2.5 px-3 text-right">Gross Profit</th>
            <th className="py-2.5 px-3 text-center">Margin %</th>
            <th className="py-2.5 px-3 text-center">Health</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {data.map((job) => (
            <tr key={job.orderNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td className="py-2.5 px-3">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{job.customer}</p>
                <p className="text-[10px] text-slate-400 font-mono">{job.orderNo}</p>
              </td>
              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{job.capacity}</td>
              <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                {formatCurrency(job.revenue)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                {formatCurrency(job.directCost)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                {formatCurrency(job.grossProfit)}
              </td>
              <td className="py-2.5 px-3 text-center font-mono font-bold">
                {job.marginPercent}%
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusPill status={job.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
