"use client";

import * as React from "react";

interface InstallationTrendsChartProps {
  data?: {
    month: string;
    completed: number;
    inProgress: number;
  }[];
  isLoading?: boolean;
  error?: string | null;
}

export function InstallationTrendsChart({
  data = [],
  isLoading,
  error,
}: InstallationTrendsChartProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg animate-pulse">
        <span className="text-xs text-slate-400">Loading installation trajectory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-56 flex flex-col items-center justify-center bg-rose-50/30 rounded-lg p-4 text-center">
        <p className="text-xs font-semibold text-rose-600">Failed to load installation trajectory</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
        <span className="text-xs text-slate-400">No installation records available.</span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.completed + d.inProgress)) * 1.25;
  const chartHeight = 160;
  const chartWidth = 500;
  const colWidth = chartWidth / (data.length - 1 || 1);

  // Compute SVG polyline points
  const points = data.map((d, i) => {
    const x = i * colWidth;
    const y = chartHeight - (d.completed / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Completed Installs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Work-in-Progress</span>
          </div>
        </div>

        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="text-[11px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded shadow">
            {data[hoveredIdx].month}: {data[hoveredIdx].completed} Done • {data[hoveredIdx].inProgress} Active
          </div>
        )}
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="w-full h-44 select-none">
          <defs>
            <linearGradient id="installGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((r, idx) => {
            const y = chartHeight - r * chartHeight;
            return (
              <line
                key={idx}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Shaded Area */}
          <path d={areaD} fill="url(#installGradient)" />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  className="fill-white stroke-emerald-600 stroke-2 transition-all"
                />
                <text
                  x={pt.x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-slate-500 dark:fill-slate-400"
                >
                  {pt.data.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
