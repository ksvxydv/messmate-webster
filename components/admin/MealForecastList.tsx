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
              {/* Header: Meal Type + Cutoff on Left, 3 KPI Chips on Right */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D8]/70 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#244C3B] text-white font-black text-xs rounded-lg uppercase tracking-wider shadow-2xs">
                    {m.meal_type}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF7F0] border border-[#E5E1D8] text-xs font-mono text-[#777064]">
                    <Clock3 className="w-3.5 h-3.5 text-[#244C3B]" />
                    Cutoff: {new Date(m.cutoff_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-xl bg-[#244C3B]/10 border border-[#244C3B]/20 text-center min-w-[64px]">
                    <span className="text-[9px] uppercase font-bold text-[#244C3B] tracking-wider block leading-tight">Cook For</span>
                    <span className="text-sm sm:text-base font-black text-[#244C3B] leading-none">{m.Projected}</span>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-[64px]">
                    <span className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider block leading-tight">Eaten</span>
                    <span className="text-sm sm:text-base font-black text-[#15803D] leading-none">{m.Consumed}</span>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-center min-w-[64px]">
                    <span className="text-[9px] uppercase font-bold text-amber-800 tracking-wider block leading-tight">Skipped</span>
                    <span className="text-sm sm:text-base font-black text-[#B45309] leading-none">{m.OptedOut}</span>
                  </div>
                </div>
              </div>

              {/* Menu Section: Fixed-width 72px column grid for perfect text alignment */}
              {variants.rawText ? (
                <p className="font-bold text-[#252820] text-sm pt-0.5">{variants.rawText}</p>
              ) : (
                <div className="space-y-2 pt-0.5">
                  {showVeg && (
                    <div className="grid grid-cols-[72px_1fr] items-start gap-3 text-xs sm:text-[13px]">
                      <span className="inline-flex items-center justify-center gap-1 w-[72px] h-[22px] rounded-md bg-emerald-50 text-emerald-800 font-bold text-[10px] tracking-wider uppercase border border-emerald-200 shrink-0 select-none">
                        <Leaf className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        Veg
                      </span>
                      <p className="text-[#252820] font-medium leading-relaxed pt-0.5">
                        {variants.VEG!.join(", ")}
                      </p>
                    </div>
                  )}
                  {showNonVeg && (
                    <div className="grid grid-cols-[72px_1fr] items-start gap-3 text-xs sm:text-[13px]">
                      <span className="inline-flex items-center justify-center gap-1 w-[72px] h-[22px] rounded-md bg-rose-50 text-rose-800 font-bold text-[10px] tracking-wider uppercase border border-rose-200 shrink-0 select-none">
                        <Drumstick className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                        Non-Veg
                      </span>
                      <p className="text-[#252820] font-medium leading-relaxed pt-0.5">
                        {variants.NON_VEG!.join(", ")}
                      </p>
                    </div>
                  )}
                  {showJain && (
                    <div className="grid grid-cols-[72px_1fr] items-start gap-3 text-xs sm:text-[13px]">
                      <span className="inline-flex items-center justify-center gap-1 w-[72px] h-[22px] rounded-md bg-amber-50 text-amber-800 font-bold text-[10px] tracking-wider uppercase border border-amber-200 shrink-0 select-none">
                        <Wheat className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        Jain
                      </span>
                      <p className="text-[#252820] font-medium leading-relaxed pt-0.5">
                        {variants.JAIN!.join(", ")}
                      </p>
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
