"use client";

import React, { useState } from "react";
import { Leaf, Drumstick, Wheat, Clock3 } from "lucide-react";
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
  const [dietaryFilter, setDietaryFilter] = useState<"ALL" | "VEG" | "NON_VEG" | "JAIN">("ALL");

  return (
    <div className={`${THEME.card} p-6 sm:p-7 space-y-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-base font-black text-[#252820]">Daily Kitchen Head-Count Forecast</h3>
          <p className="text-xs text-[#777064] mt-0.5">
            Portions locked at preparation cutoffs vs. redeemed attendances
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-xl border border-[#E5E1D8] self-start sm:self-auto">
          {(["ALL", "VEG", "NON_VEG", "JAIN"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDietaryFilter(tab)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dietaryFilter === tab
                  ? "bg-[#244C3B] text-white shadow-2xs"
                  : "text-[#777064] hover:text-[#252820] hover:bg-white"
              }`}
            >
              {tab === "ALL" ? "All Menus" : tab === "NON_VEG" ? "Non-Veg" : tab === "VEG" ? "Veg" : "Jain"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {analytics.map((m) => {
          const variants = parseMenuVariants(m.menu_items);
          const showVeg = (dietaryFilter === "ALL" || dietaryFilter === "VEG") && variants.VEG && variants.VEG.length > 0;
          const showNonVeg = (dietaryFilter === "ALL" || dietaryFilter === "NON_VEG") && variants.NON_VEG && variants.NON_VEG.length > 0;
          const showJain = (dietaryFilter === "ALL" || dietaryFilter === "JAIN") && variants.JAIN && variants.JAIN.length > 0;

          return (
            <div
              key={m.id}
              className={`${THEME.subCard} p-4 sm:p-4.5 space-y-3 text-xs sm:text-sm`}
            >
              {/* Header: All 5 Boxes Uniform in Height (h-7.5) & Single-Line (whitespace-nowrap) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E5E1D8]/70 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-7.5 inline-flex items-center px-2.5 rounded-lg bg-[#244C3B] text-white font-black text-xs uppercase tracking-wider shadow-2xs whitespace-nowrap">
                    {m.meal_type}
                  </span>
                  <span className="h-7.5 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-white border border-[#E5E1D8] text-xs font-mono font-bold text-[#777064] shadow-2xs whitespace-nowrap">
                    <Clock3 className="w-3.5 h-3.5 text-[#244C3B] shrink-0" />
                    <span>Cutoff {new Date(m.cutoff_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="h-7.5 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-[#244C3B]/10 border border-[#244C3B]/20 text-xs font-bold text-[#244C3B] shadow-2xs whitespace-nowrap">
                    <span className="text-[10px] text-[#244C3B]/80 uppercase tracking-wider">Cook</span>
                    <span className="font-black text-xs sm:text-sm">{m.Projected}</span>
                  </div>
                  <div className="h-7.5 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#15803D] shadow-2xs whitespace-nowrap">
                    <span className="text-[10px] text-emerald-800 uppercase tracking-wider">Eaten</span>
                    <span className="font-black text-xs sm:text-sm">{m.Consumed}</span>
                  </div>
                  <div className="h-7.5 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-[#B45309] shadow-2xs whitespace-nowrap">
                    <span className="text-[10px] text-amber-800 uppercase tracking-wider">Skipped</span>
                    <span className="font-black text-xs sm:text-sm">{m.OptedOut}</span>
                  </div>
                </div>
              </div>

              {/* Menu Section: Fixed-width 74px badge + discrete self-contained dish chips (no orphaned words) */}
              {variants.rawText ? (
                <p className="font-bold text-[#252820] text-sm pt-0.5">{variants.rawText}</p>
              ) : (
                <div className="space-y-2.5 pt-0.5">
                  {showVeg && (
                    <div className="grid grid-cols-[74px_1fr] items-start gap-2.5">
                      <span className="h-7 inline-flex items-center justify-center gap-1 w-[74px] rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[10px] tracking-wider uppercase border border-emerald-200 shrink-0 select-none shadow-3xs">
                        <Leaf className="w-3 h-3 text-emerald-600 shrink-0" />
                        Veg
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {variants.VEG!.map((dish) => (
                          <span
                            key={dish}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-[#E5E1D8] text-xs font-semibold text-[#252820] shadow-3xs whitespace-nowrap"
                          >
                            {dish}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {showNonVeg && (
                    <div className="grid grid-cols-[74px_1fr] items-start gap-2.5">
                      <span className="h-7 inline-flex items-center justify-center gap-1 w-[74px] rounded-lg bg-rose-50 text-rose-800 font-bold text-[10px] tracking-wider uppercase border border-rose-200 shrink-0 select-none shadow-3xs">
                        <Drumstick className="w-3 h-3 text-rose-600 shrink-0" />
                        Non-Veg
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {variants.NON_VEG!.map((dish) => (
                          <span
                            key={dish}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-[#E5E1D8] text-xs font-semibold text-[#252820] shadow-3xs whitespace-nowrap"
                          >
                            {dish}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {showJain && (
                    <div className="grid grid-cols-[74px_1fr] items-start gap-2.5">
                      <span className="h-7 inline-flex items-center justify-center gap-1 w-[74px] rounded-lg bg-amber-50 text-amber-800 font-bold text-[10px] tracking-wider uppercase border border-amber-200 shrink-0 select-none shadow-3xs">
                        <Wheat className="w-3 h-3 text-amber-600 shrink-0" />
                        Jain
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {variants.JAIN!.map((dish) => (
                          <span
                            key={dish}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-[#E5E1D8] text-xs font-semibold text-[#252820] shadow-3xs whitespace-nowrap"
                          >
                            {dish}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
