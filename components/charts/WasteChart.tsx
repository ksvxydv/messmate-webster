"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { THEME } from "@/lib/theme";

interface WasteChartProps {
  data: any[];
}

export default function WasteChart({ data }: WasteChartProps) {
  return (
    <div className={`${THEME.card} p-6 sm:p-7 flex flex-col justify-between space-y-4`}>
      <div>
        <h3 className="text-base font-black text-[#252820]">
          Attendance Telemetry &amp; Utilization
        </h3>
        <p className="text-xs sm:text-sm text-[#777064] mt-0.5">
          Comparison of kitchen cook projections, verified counter redemptions, and pre-cutoff saved portions
        </p>
      </div>

      <div className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" />
            <XAxis
              dataKey="name"
              stroke="#777064"
              tick={{ fontSize: 12, fill: "#252820", fontWeight: "bold" }}
            />
            <YAxis
              allowDecimals={false}
              stroke="#777064"
              tick={{ fontSize: 12, fill: "#777064" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E5E1D8",
                color: "#252820",
                borderRadius: "0.75rem",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#252820", fontWeight: "bold", marginBottom: "4px" }}
              formatter={(value: any, name: any) => [`${value} portions`, name]}
            />
            <Legend
              wrapperStyle={{ paddingTop: "12px", fontSize: "12px", fontWeight: "bold" }}
            />
            <Bar
              dataKey="Projected"
              fill="#244C3B"
              radius={[4, 4, 0, 0]}
              name="Projected (Cook For)"
            />
            <Bar
              dataKey="Consumed"
              fill="#15803D"
              radius={[4, 4, 0, 0]}
              name="Consumed (Checked In)"
            />
            <Bar
              dataKey="OptedOut"
              fill="#D99A51"
              radius={[4, 4, 0, 0]}
              name="Pre-Cutoff Skipped"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
