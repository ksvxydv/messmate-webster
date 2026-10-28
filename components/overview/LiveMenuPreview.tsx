"use client";

import React, { useState } from "react";
import {
  ChefHat,
  Coffee,
  Soup,
  Moon,
  Utensils,
  UtensilsCrossed,
  Sparkles,
  Leaf,
  Drumstick,
  Wheat,
} from "lucide-react";
import { THEME } from "@/lib/theme";
import { resolveDietaryDishes } from "@/lib/menus";
import { DietaryPref } from "@/types";

interface LiveMenuPreviewProps {
  todayMeals: any[];
}

export default function LiveMenuPreview({ todayMeals }: LiveMenuPreviewProps) {
  const [activePref, setActivePref] = useState<DietaryPref>("VEG");

  return (
    <div className={`${THEME.card} p-5 sm:p-6 space-y-4 shadow-xs`}>
      {/* Header: Title & Compact Dietary Preference Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#244C3B]/10 border border-[#244C3B]/20 flex items-center justify-center text-[#244C3B] shrink-0">
            <ChefHat className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#252820] leading-tight">
              Today&apos;s Mess Schedule &amp; Menu
            </h3>
            <p className="text-xs text-[#777064] mt-0.5">SVBH &amp; Tilak Hostel Dining Hall</p>
          </div>
        </div>

        {/* Compact Dietary Preview Filter */}
        <div className="flex items-center bg-[#FAF7F0] p-0.5 rounded-xl border border-[#E5E1D8] text-xs self-start sm:self-auto shrink-0">
          {(["VEG", "NON_VEG", "JAIN"] as const).map((pref) => (
            <button
              key={pref}
              type="button"
              onClick={() => setActivePref(pref)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activePref === pref
                  ? "bg-[#244C3B] text-white shadow-2xs"
                  : "text-[#777064] hover:text-[#252820]"
              }`}
            >
              {pref === "VEG" && <Leaf className="w-3 h-3 text-emerald-400 shrink-0" />}
              {pref === "NON_VEG" && <Drumstick className="w-3 h-3 text-rose-400 shrink-0" />}
              {pref === "JAIN" && <Wheat className="w-3 h-3 text-amber-400 shrink-0" />}
              <span>{pref === "VEG" ? "Veg" : pref === "NON_VEG" ? "Non-Veg" : "Jain"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Meal Items Preview */}
      <div className="space-y-3">
        {todayMeals.length > 0 ? (
          todayMeals.map((meal) => {
            const MealIcon =
              meal.meal_type === "BREAKFAST"
                ? Coffee
                : meal.meal_type === "LUNCH"
                  ? Soup
                  : Moon;

            // Resolve dishes for active dietary filter
            let dishes: string[] = [];
            if (meal.dietary_variants && meal.dietary_variants[activePref]) {
              dishes = meal.dietary_variants[activePref];
            } else {
              dishes = resolveDietaryDishes(
                meal.meal_type,
                meal.meal_date,
                activePref,
                meal.menu_items
              ).dishes;
            }

            const timingText =
              meal.meal_type === "BREAKFAST"
                ? "7:30 AM – 10:30 AM"
                : meal.meal_type === "LUNCH"
                  ? "12:00 PM – 2:30 PM"
                  : "7:30 PM – 10:00 PM";

            return (
              <div
                key={meal.id}
                className="p-3.5 sm:p-4 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-[#244C3B]/40 card-hover-lift transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MealIcon className="w-3.5 h-3.5 text-[#D99A51] shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-[#252820] tracking-wide">
                      {meal.meal_type}
                    </span>
                    <span className="text-xs text-[#777064] font-medium">({timingText})</span>
                  </div>

                  <div key={`${meal.id}-${activePref}`} className="flex flex-wrap gap-1.5 pt-0.5 animate-fade-in-up">
                    {dishes.map((d, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-[#252820] border border-[#E5E1D8] shadow-2xs flex items-center gap-1.5 whitespace-nowrap hover:border-[#244C3B]/40 transition-colors"
                      >
                        <Utensils className="w-3 h-3 text-[#244C3B] shrink-0" />
                        <span>{d}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-left md:text-right shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5E1D8]/60">
                  <span className="text-xs font-black text-[#15803D] block">
                    ₹{meal.unit_cost || 50} Rebate
                  </span>
                  <div className="text-[11px] text-[#777064]">if opted-out pre-cutoff</div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-sm text-[#777064] space-y-2">
            <UtensilsCrossed className="w-6 h-6 text-[#777064] mx-auto" />
            <p>Daily meal schedule active. Sign in to view options.</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-[#E5E1D8] flex items-center justify-between text-xs text-[#777064]">
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#D99A51] shrink-0" />
          <span>Dietary preferences verified daily at preparation cutoffs</span>
        </span>
      </div>
    </div>
  );
}
