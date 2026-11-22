"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  data?: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  isLoading?: boolean;
  error?: string | null;
}

export function RevenueChart({ data = [], isLoading, error }: RevenueChartProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg animate-pulse">
        <span className="text-xs text-slate-400">Loading revenue analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-rose-50/30 dark:bg-rose-950/10 rounded-lg border border-rose-200 dark:border-rose-900/40 p-4 text-center">
        <p className="text-xs font-semibold text-rose-600">Failed to load revenue metrics</p>
        <p className="text-[11px] text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
        <span className="text-xs text-slate-400">No revenue data available for selected period.</span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.expenses))) * 1.15;
  const chartHeight = 180;
  const chartWidth = 500;
  const colWidth = chartWidth / data.length;

  return (
    <div className="space-y-3">
      {/* Legend & Summary */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Direct Expenses</span>
          </div>
        </div>

        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="text-[11px] font-mono bg-slate-900 text-white px-2 py-1 rounded shadow-md">
            {data[hoveredIdx].month}: Rev {formatCurrency(data[hoveredIdx].revenue)} • Exp{" "}
            {formatCurrency(data[hoveredIdx].expenses)} • Margin{" "}
            {Math.round(((data[hoveredIdx].revenue - data[hoveredIdx].expenses) / data[hoveredIdx].revenue) * 100)}%
          </div>
        )}
      </div>

      {/* SVG Bar Chart with Gradients & Tooltips */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
          className="w-full h-48 select-none"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = chartHeight - ratio * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <text
                  x="2"
                  y={y - 3}
                  className="text-[9px] fill-slate-400 dark:fill-slate-600 font-mono"
                >
                  {formatCurrency(ratio * maxVal).replace(".00", "")}
                </text>
              </g>
            );
          })}

          {/* Grouped Bars */}
          {data.map((item, idx) => {
            const x = idx * colWidth + colWidth * 0.15;
            const barWidth = colWidth * 0.32;

            const revHeight = (item.revenue / maxVal) * chartHeight;
            const expHeight = (item.expenses / maxVal) * chartHeight;

            const revY = chartHeight - revHeight;
            const expY = chartHeight - expHeight;

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-opacity"
                opacity={hoveredIdx === null || isHovered ? 1 : 0.6}
              >
                {/* Revenue Bar (Emerald Green) */}
                <rect
                  x={x}
                  y={revY}
                  width={barWidth}
                  height={revHeight}
                  rx="3"
                  className="fill-emerald-500 hover:fill-emerald-400 transition-colors"
                />

                {/* Expenses Bar (Rose / Navy) */}
                <rect
                  x={x + barWidth + 4}
                  y={expY}
                  width={barWidth}
                  height={expHeight}
                  rx="3"
                  className="fill-rose-500 hover:fill-rose-400 transition-colors"
                />

                {/* Month Label */}
                <text
                  x={x + barWidth}
                  y={chartHeight + 18}
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-slate-500 dark:fill-slate-400"
                >
                  {item.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
