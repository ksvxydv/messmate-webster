"use client";

import React from "react";
import { Leaf, Drumstick, Wheat } from "lucide-react";
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

interface ParsedMenuVariants {
  VEG?: string[];
  NON_VEG?: string[];
  JAIN?: string[];
  rawText?: string;
}

function parseMenuVariants(menuItems: string): ParsedMenuVariants {
  if (!menuItems) return {};
  if (typeof menuItems === "string" && menuItems.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(menuItems);
      if (parsed && typeof parsed === "object") {
        return {
          VEG: Array.isArray(parsed.VEG) ? parsed.VEG : undefined,
          NON_VEG: Array.isArray(parsed.NON_VEG) ? parsed.NON_VEG : undefined,
          JAIN: Array.isArray(parsed.JAIN) ? parsed.JAIN : undefined,
        };
      }
    } catch {
      // Fallback to raw text below
    }
  }
  return { rawText: menuItems };
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
        {analytics.map((m) => {
          const variants = parseMenuVariants(m.menu_items);
          return (
            <div
              key={m.id}
              className={`${THEME.subCard} p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs sm:text-sm`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#244C3B]/10 text-[#244C3B] font-bold text-xs rounded uppercase border border-[#244C3B]/20">
                    {m.meal_type}
                  </span>
                  <span className="text-xs text-[#777064] font-mono">
                    Cutoff: {new Date(m.cutoff_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {variants.rawText ? (
                  <p className="font-bold text-[#252820] text-sm">{variants.rawText}</p>
                ) : (
                  <div className="space-y-1.5 pt-0.5">
                    {variants.VEG && variants.VEG.length > 0 && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] tracking-wide uppercase border border-emerald-200 shrink-0">
                          <Leaf className="w-2.5 h-2.5 text-emerald-600" />
                          Veg
                        </span>
                        <span className="text-[#252820] font-medium leading-relaxed">
                          {variants.VEG.join(", ")}
                        </span>
                      </div>
                    )}
                    {variants.NON_VEG && variants.NON_VEG.length > 0 && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 font-bold text-[10px] tracking-wide uppercase border border-rose-200 shrink-0">
                          <Drumstick className="w-2.5 h-2.5 text-rose-600" />
                          Non-Veg
                        </span>
                        <span className="text-[#252820] font-medium leading-relaxed">
                          {variants.NON_VEG.join(", ")}
                        </span>
                      </div>
                    )}
                    {variants.JAIN && variants.JAIN.length > 0 && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[10px] tracking-wide uppercase border border-amber-200 shrink-0">
                          <Wheat className="w-2.5 h-2.5 text-amber-600" />
                          Jain
                        </span>
                        <span className="text-[#252820] font-medium leading-relaxed">
                          {variants.JAIN.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-left sm:text-right space-y-1 font-bold shrink-0 self-start sm:self-center pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-[#E5E1D8]/60 pt-2 sm:pt-0 w-full sm:w-auto flex sm:flex-col justify-between sm:justify-start">
                <p className="text-[#777064] text-xs">
                  Cook For: <strong className="text-[#244C3B] text-sm font-black">{m.Projected}</strong>
                </p>
                <p className="text-[#777064] text-xs">
                  Eaten: <strong className="text-[#15803D] text-sm font-black">{m.Consumed}</strong>
                </p>
                <p className="text-[#777064] text-xs">
                  Skipped: <strong className="text-[#B45309] text-sm font-black">{m.OptedOut}</strong>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
