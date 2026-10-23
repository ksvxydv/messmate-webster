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

interface WasteChartProps {
  data: any[];
}

export default function WasteChart({ data }: WasteChartProps) {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col transition-colors">
      <h2 className="text-base font-bold text-gray-800 dark:text-white mb-1">
        Food Waste Analytics (Projected vs. Consumed)
      </h2>
      <p className="text-xs text-gray-400 dark:text-gray-400 mb-4">
        Visual comparison of locked meal commitments against verified QR
        redemptions
      </p>
      <div className="w-full h-64 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
            />
            <YAxis
              allowDecimals={false}
              stroke="#9ca3af"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                borderColor: "#1f2937",
                color: "#f9fafb",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              labelStyle={{
                color: "#f9fafb",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
              itemStyle={{
                color: "#d1d5db",
                fontSize: "12px",
                padding: "2px 0",
              }}
            />
            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
            <Bar dataKey="Projected" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Consumed" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="OptedOut" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
