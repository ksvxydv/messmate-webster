"use client";

import React from "react";
import {
  Coffee,
  Soup,
  Moon,
  Sparkles,
  Clock3,
  Utensils,
  BadgeCheck,
  QrCode,
  CircleMinus,
  CircleCheck,
  LockKeyhole,
  Leaf,
  Drumstick,
  Wheat,
  AlertCircle,
} from "lucide-react";
import { THEME } from "@/lib/theme";
import { getMealTimingDetails, formatCountdownText } from "@/lib/meal-times";
import { resolveDietaryDishes } from "@/lib/menus";
import StatusBadge from "@/components/ui/StatusBadge";
import { StudentMealView, DietaryPref } from "@/types";

interface MealCardProps {
  meal: StudentMealView;
  dietaryPref?: DietaryPref;
  now: Date;
  onShowQR: (meal: StudentMealView) => void;
  onToggle: (mealSlotId: string, currentStatus: string) => void;
}

export default function MealCard({
  meal,
  dietaryPref = "VEG",
  now,
  onShowQR,
  onToggle,
}: MealCardProps) {
  const isConsumed = meal.bookingStatus === "CONSUMED";
  const isOptedOut = meal.bookingStatus === "OPTED_OUT";
  const isCutoffPassed = new Date(meal.cutoff_time).getTime() <= now.getTime();
  const timing = getMealTimingDetails(meal.meal_type, meal.meal_date, now);

  // Authoritatively resolve dishes according to active student's dietary preference
  const activePref = (dietaryPref || "VEG").toUpperCase() as DietaryPref;
  let dishes: string[] = [];
  let isConfigured = true;

  if (meal.dietary_variants && meal.dietary_variants[activePref] && meal.dietary_variants[activePref].length > 0) {
    dishes = meal.dietary_variants[activePref];
  } else {
    const resolved = resolveDietaryDishes(
      meal.meal_type,
      meal.meal_date,
      activePref,
      meal.menu_items
    );
    dishes = resolved.dishes;
    isConfigured = resolved.isConfigured;
  }

  const MealIcon =
    meal.meal_type === "BREAKFAST"
      ? Coffee
      : meal.meal_type === "LUNCH"
        ? Soup
        : Moon;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
        timing.isServingNow
          ? "bg-white border-[#244C3B] ring-2 ring-[#244C3B]/10"
          : `${THEME.card}`
      }`}
    >
      {/* Visual Meal Header Strip */}
      <div
        className={`px-5 py-4 bg-gradient-to-r ${timing.theme.headerGradient} border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${timing.theme.badgeBg}`}
          >
            <MealIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-[#252820] text-base tracking-wide">
                {meal.meal_type}
              </span>
              {timing.isServingNow && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#244C3B] text-white flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-[#D99A51]" /> SERVING NOW
                </span>
              )}
            </div>
            <p className="text-xs text-[#777064] font-medium">
              Serving Hours: <span className="text-[#252820] font-bold">{timing.timingLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-[#252820] flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#E5E1D8] font-mono shadow-2xs">
            <Clock3 className="w-3.5 h-3.5 text-[#D99A51]" />
            Cutoff: {formatCountdownText(meal.cutoff_time, now)}
          </span>
          <StatusBadge status={meal.bookingStatus} size="sm" />
        </div>
      </div>

      {/* Dish Menu & Action Center */}
      <div className="p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-3 max-w-xl">
          {/* Active Dietary Variant Label */}
          <div className="flex items-center gap-2">
            {activePref === "VEG" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <Leaf className="w-3 h-3 text-emerald-600" />
                <span>Vegetarian Menu</span>
              </span>
            )}
            {activePref === "NON_VEG" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                <Drumstick className="w-3 h-3 text-rose-600" />
                <span>Non-Veg Menu</span>
              </span>
            )}
            {activePref === "JAIN" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                <Wheat className="w-3 h-3 text-amber-600" />
                <span>Jain Menu (No Onion / Garlic / Root Veg)</span>
              </span>
            )}
          </div>

          {/* Dishes List or Fallback Empty State */}
          {isConfigured && dishes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dishes.map((dish, i) => (
                <span
                  key={i}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-1.5 shadow-2xs ${timing.theme.tagStyle}`}
                >
                  <Utensils className="w-3.5 h-3.5 text-[#244C3B]" />
                  <span>{dish}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Menu not configured for {activePref} dining in this slot.</span>
            </div>
          )}

          <p className="text-xs sm:text-sm text-[#777064] flex items-center gap-2">
            <span>
              Rebate: <strong className="text-[#15803D] font-bold">₹{meal.unit_cost || 50}</strong> auto-credited if skipped before preparation deadline.
            </span>
          </p>
        </div>

        {/* Single Dominant Action Area */}
        <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-[#E5E1D8]">
          {/* Case 1: Already Consumed */}
          {isConsumed && (
            <div className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs">
              <BadgeCheck className="w-4 h-4 text-emerald-700 stroke-[2.2]" />
              <span>Meal Redeemed at Counter</span>
            </div>
          )}

          {/* Case 2: Serving Now & Attending */}
          {!isConsumed && timing.isServingNow && !isOptedOut && (
            <button
              onClick={() => onShowQR(meal)}
              className="px-5 py-2.5 bg-[#244C3B] hover:bg-[#1B3A2D] text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-[#244C3B]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4 stroke-[2.5]" />
              <span>Show Dining Pass</span>
            </button>
          )}

          {/* Case 3: Pre-Cutoff Decision Time */}
          {!isConsumed && !isCutoffPassed && (
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {meal.bookingStatus === "OPTED_IN" ? (
                <button
                  onClick={() => onToggle(meal.id, meal.bookingStatus)}
                  className="w-full md:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <CircleMinus className="w-4 h-4 text-rose-700" />
                  <span>Skip Meal (+₹{meal.unit_cost || 50} Rebate)</span>
                </button>
              ) : (
                <button
                  onClick={() => onToggle(meal.id, meal.bookingStatus)}
                  className="w-full md:w-auto px-4 py-2.5 bg-[#244C3B] hover:bg-[#1B3A2D] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-xs"
                >
                  <CircleCheck className="w-4 h-4 text-emerald-300" />
                  <span>Attend Meal (Cancel Rebate)</span>
                </button>
              )}
            </div>
          )}

          {/* Case 4: Cutoff Passed but Before Service Window */}
          {!isConsumed && isCutoffPassed && timing.isBeforeServing && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {isOptedOut ? (
                <div className="px-4 py-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-2xs">
                  <CircleMinus className="w-4 h-4 text-amber-700" />
                  <span>Skipped (₹{meal.unit_cost || 50} Credited)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <div className="px-3.5 py-2 rounded-xl bg-[#FAF7F0] text-[#777064] border border-[#E5E1D8] text-xs font-semibold flex items-center gap-2">
                    <LockKeyhole className="w-3.5 h-3.5 text-[#244C3B]" />
                    <span>Prep Locked • Opens {timing.timingLabel.split("–")[0].trim()}</span>
                  </div>
                  <button
                    onClick={() => onShowQR(meal)}
                    className="text-xs text-[#244C3B] hover:underline font-bold px-2 py-1 cursor-pointer"
                    title="Preview pass for evaluation"
                  >
                    (Preview Pass)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Case 5: Serving Window Ended */}
          {!isConsumed && timing.isAfterServing && (
            <div className="px-4 py-2 rounded-xl bg-[#FAF7F0] text-[#777064] border border-[#E5E1D8] text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-[#777064]" />
              <span>Serving Concluded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
