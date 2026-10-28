"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  TrendingDown,
  Activity,
  BarChart2,
  LineChart as LineChartIcon,
} from "lucide-react";
import { THEME } from "@/lib/theme";

interface WasteChartProps {
  data: any[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-[#E5E1D8] shadow-lg text-xs space-y-1.5 min-w-[160px]">
        <p className="font-black text-[#252820] text-sm border-b border-[#E5E1D8] pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.stroke }}
              />
              <span className="text-[#777064] font-medium">{entry.name}:</span>
            </div>
            <span className="font-black text-[#252820] font-mono">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function WasteChart({ data }: WasteChartProps) {
  const [chartMode, setChartMode] = useState<"FLOW" | "BARS">("FLOW");

  const totalProjected = data.reduce((sum, d) => sum + (d.Projected || 0), 0);
  const totalConsumed = data.reduce((sum, d) => sum + (d.Consumed || 0), 0);
  const totalOptedOut = data.reduce((sum, d) => sum + (d.OptedOut || 0), 0);

  const utilizationRate =
    totalProjected > 0 ? Math.round((totalConsumed / totalProjected) * 100) : 0;
  const wasteAvertedPct =
    totalProjected + totalOptedOut > 0
      ? Math.round((totalOptedOut / (totalProjected + totalOptedOut)) * 100)
      : 0;

  return (
    <div className={`${THEME.card} p-6 sm:p-7 space-y-5 flex flex-col justify-between`}>
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-[#252820]">
              Attendance Telemetry &amp; Utilization
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#244C3B]/10 text-[#244C3B] border border-[#244C3B]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs text-[#777064] mt-0.5">
            Portion commitments vs. real-time counter redemptions &amp; food waste prevention
          </p>
        </div>

        {/* Chart Style Switcher */}
        <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-xl border border-[#E5E1D8] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartMode("FLOW")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chartMode === "FLOW"
                ? "bg-[#244C3B] text-white shadow-2xs"
                : "text-[#777064] hover:text-[#252820] hover:bg-white"
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            <span>Flow</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode("BARS")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chartMode === "BARS"
                ? "bg-[#244C3B] text-white shadow-2xs"
                : "text-[#777064] hover:text-[#252820] hover:bg-white"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Bars</span>
          </button>
        </div>
      </div>

      {/* Telemetry Summary Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Counter Redemption
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#244C3B] leading-none">
              {utilizationRate}%
            </span>
            <span className="text-[11px] text-[#777064] block font-medium">
              {totalConsumed} of {totalProjected} checked in
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Waste Averted (Saved)
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#B45309] leading-none">
              {totalOptedOut}
            </span>
            <span className="text-[11px] text-[#777064] block font-medium">
              {wasteAvertedPct}% pre-cutoff savings
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-[#B45309] flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Aesthetic Chart Area */}
      <div className="w-full h-52 sm:h-56 bg-[#FAF7F0] rounded-2xl p-3 border border-[#E5E1D8] relative">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === "FLOW" ? (
            <AreaChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#244C3B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#244C3B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="consumedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15803D" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#15803D" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="optedOutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D99A51" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#D99A51" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#777064"
                tick={{ fontSize: 11, fill: "#252820", fontWeight: "bold" }}
                axisLine={{ stroke: "#E5E1D8" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                stroke="#777064"
                tick={{ fontSize: 11, fill: "#777064" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="Projected"
                name="Cook For"
                stroke="#244C3B"
                strokeWidth={2.5}
                fill="url(#projectedGrad)"
                dot={{ r: 4, fill: "#244C3B", strokeWidth: 2, stroke: "#FFFFFF" }}
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="Consumed"
                name="Consumed"
                stroke="#15803D"
                strokeWidth={2.5}
                fill="url(#consumedGrad)"
                dot={{ r: 4, fill: "#15803D", strokeWidth: 2, stroke: "#FFFFFF" }}
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="OptedOut"
                name="Skipped"
                stroke="#D99A51"
                strokeWidth={2.5}
                fill="url(#optedOutGrad)"
                dot={{ r: 4, fill: "#D99A51", strokeWidth: 2, stroke: "#FFFFFF" }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#777064"
                tick={{ fontSize: 11, fill: "#252820", fontWeight: "bold" }}
                axisLine={{ stroke: "#E5E1D8" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                stroke="#777064"
                tick={{ fontSize: 11, fill: "#777064" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="Projected"
                name="Cook For"
                fill="#244C3B"
                radius={[5, 5, 0, 0]}
              />
              <Bar
                dataKey="Consumed"
                name="Consumed"
                fill="#15803D"
                radius={[5, 5, 0, 0]}
              />
              <Bar
                dataKey="OptedOut"
                name="Skipped"
                fill="#D99A51"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>

        {/* Legend Indicators */}
        <div className="flex items-center justify-center gap-4 pt-1 text-[11px] font-bold text-[#777064]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#244C3B]" />
            <span>Cook For</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
            <span>Consumed</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D99A51]" />
            <span>Skipped</span>
          </span>
        </div>
      </div>

      {/* Meal Progression Breakdown: Fills the lower card seamlessly */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between text-xs font-bold text-[#777064] uppercase tracking-wider px-1">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#244C3B]" />
            <span>Meal Slot Fulfillment</span>
          </span>
          <span>Redeemed vs Planned</span>
        </div>

        {data.map((m) => {
          const pct =
            m.Projected > 0 ? Math.min(100, Math.round((m.Consumed / m.Projected) * 100)) : 0;
          return (
            <div
              key={m.id || m.name}
              className="p-3 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] space-y-2"
            >
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#252820] tracking-wide">{m.name}</span>
                  <span className="text-[11px] text-[#777064] font-medium font-mono">
                    ({m.Consumed} of {m.Projected} Eaten)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {m.OptedOut > 0 && (
                    <span className="text-[10px] font-bold text-[#B45309] bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-md">
                      {m.OptedOut} Saved
                    </span>
                  )}
                  <span className="text-xs font-black text-[#244C3B] font-mono">{pct}%</span>
                </div>
              </div>

              {/* Multi-segment progress track */}
              <div className="w-full h-2 rounded-full bg-[#E5E1D8] overflow-hidden flex">
                <div
                  className="bg-[#15803D] transition-all duration-500 rounded-l-full"
                  style={{ width: `${pct}%` }}
                />
                <div
                  className="bg-[#D99A51] transition-all duration-500"
                  style={{
                    width: `${m.Projected > 0 ? (m.OptedOut / m.Projected) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
