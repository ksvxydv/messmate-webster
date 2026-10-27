"use client";

import React from "react";
import { THEME } from "@/lib/theme";

interface MealAnalyticsItem {
  id: string;
  meal_type: string;
  menu_items: string;
  cutoff_time: string;
  Projected: number;
  Consumed: number;
  OptedOut: number;
}

interface MealForecastListProps {
  analytics: MealAnalyticsItem[];
}

export default function MealForecastList({
  analytics,
}: MealForecastListProps) {
  return (
    <div className={`${THEME.card} p-6 sm:p-7 space-y-4`}>
      <div>
        <h3 className="text-base font-black text-[#252820]">Daily Kitchen Head-Count Forecast</h3>
        <p className="text-xs text-[#777064] mt-0.5">
          Portions locked at preparation cutoffs vs. redeemed attendances
        </p>
      </div>
      <div className="space-y-3">
        {analytics.map((m) => (
          <div
            key={m.id}
            className={`${THEME.subCard} p-4 flex justify-between items-center text-xs sm:text-sm`}
          >
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-[#244C3B]/10 text-[#244C3B] font-bold text-xs rounded uppercase border border-[#244C3B]/20">
                {m.meal_type}
              </span>
              <p className="font-bold text-[#252820] text-sm">{m.menu_items}</p>
              <p className="text-xs text-[#777064] font-mono">
                Cutoff: {new Date(m.cutoff_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="text-right space-y-1 font-bold">
              <p className="text-[#777064]">
                Cook For: <strong className="text-[#244C3B] font-black">{m.Projected}</strong>
              </p>
              <p className="text-[#777064]">
                Eaten: <strong className="text-[#15803D] font-black">{m.Consumed}</strong>
              </p>
              <p className="text-[#777064]">
                Skipped: <strong className="text-[#B45309] font-black">{m.OptedOut}</strong>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
