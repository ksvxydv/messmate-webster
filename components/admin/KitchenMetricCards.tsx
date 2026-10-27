"use client";

import React from "react";
import { ChefHat, CheckCircle2, TrendingDown, AlertTriangle } from "lucide-react";

interface KitchenMetricCardsProps {
  totalProjected: number;
  totalConsumed: number;
  totalOptedOut: number;
  totalSurplus: number;
}

export default function KitchenMetricCards({
  totalProjected,
  totalConsumed,
  totalOptedOut,
  totalSurplus,
}: KitchenMetricCardsProps) {
  const cards = [
    {
      label: "Kitchen Cook Portions",
      val: totalProjected,
      desc: "Active portion headcount for kitchen prep",
      icon: ChefHat,
      color: "text-[#244C3B]",
      bg: "bg-[#F0FDF4] border-[#BBF7D0]",
    },
    {
      label: "Verified Consumed",
      val: totalConsumed,
      desc: "Single-use passes redeemed at counter",
      icon: CheckCircle2,
      color: "text-[#15803D]",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Skipping (Saved)",
      val: totalOptedOut,
      desc: "Opted out pre-cutoff (Rebated)",
      icon: TrendingDown,
      color: "text-[#B45309]",
      bg: "bg-[#FFFBEB] border-[#FDE68A]",
    },
    {
      label: "Estimated Surplus",
      val: totalSurplus,
      desc: "Unclaimed cooked portions ready for NGO",
      icon: AlertTriangle,
      color: "text-rose-800",
      bg: "bg-rose-50 border-rose-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className={`p-5 rounded-2xl border ${kpi.bg} space-y-1.5 shadow-2xs`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#777064]">
                {kpi.label}
              </span>
              <Icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className={`text-2xl sm:text-3xl font-black ${kpi.color}`}>{kpi.val}</p>
            <p className="text-xs text-[#777064] font-medium leading-relaxed">{kpi.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
