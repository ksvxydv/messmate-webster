// Meal timing configurations, culinary visual themes, and serving window logic for MessMate
// Indian food-inspired palette: Deep Green (#244C3B), Warm Ivory (#F7F4EC), Saffron (#D99A51)

export interface MealWindowConfig {
  mealType: "BREAKFAST" | "LUNCH" | "DINNER";
  cutoffHour: number;
  cutoffMinute: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  timingLabel: string;
  cutoffLabel: string;
  theme: {
    accentColor: string;
    badgeBg: string;
    borderGlow: string;
    headerGradient: string;
    iconColor: string;
    tagStyle: string;
  };
}

export const MEAL_TIMINGS: Record<string, MealWindowConfig> = {
  BREAKFAST: {
    mealType: "BREAKFAST",
    cutoffHour: 8,
    cutoffMinute: 30,
    startHour: 7,
    startMinute: 30,
    endHour: 10,
    endMinute: 30,
    timingLabel: "7:30 AM – 10:30 AM",
    cutoffLabel: "8:30 AM",
    theme: {
      accentColor: "text-[#D99A51]",
      badgeBg: "bg-[#D99A51]/15 text-[#9E651E] border-[#D99A51]/30",
      borderGlow: "border-[#D99A51]/40 hover:border-[#D99A51]",
      headerGradient: "from-[#FFFBEB] to-white",
      iconColor: "text-[#D99A51]",
      tagStyle: "bg-[#FAF7F0] text-[#78350F] border-[#FDE68A]",
    },
  },
  LUNCH: {
    mealType: "LUNCH",
    cutoffHour: 12,
    cutoffMinute: 0,
    startHour: 12,
    startMinute: 0,
    endHour: 14,
    endMinute: 30,
    timingLabel: "12:00 PM – 2:30 PM",
    cutoffLabel: "12:00 PM",
    theme: {
      accentColor: "text-[#244C3B]",
      badgeBg: "bg-[#244C3B]/10 text-[#244C3B] border-[#244C3B]/25",
      borderGlow: "border-[#244C3B]/30 hover:border-[#244C3B]",
      headerGradient: "from-[#F0FDF4] to-white",
      iconColor: "text-[#244C3B]",
      tagStyle: "bg-[#F0FDF4] text-[#14532D] border-[#BBF7D0]",
    },
  },
  DINNER: {
    mealType: "DINNER",
    cutoffHour: 19,
    cutoffMinute: 0,
    startHour: 19,
    startMinute: 30,
    endHour: 22,
    endMinute: 0,
    timingLabel: "7:30 PM – 10:00 PM",
    cutoffLabel: "7:00 PM",
    theme: {
      accentColor: "text-[#854D0E]",
      badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
      borderGlow: "border-amber-300 hover:border-amber-500",
      headerGradient: "from-[#FEF3C7]/40 to-white",
      iconColor: "text-[#B45309]",
      tagStyle: "bg-[#FEFCE8] text-[#713F12] border-[#FEF08A]",
    },
  },
};

export interface MealStatusDetails {
  timingLabel: string;
  cutoffLabel: string;
  isCutoffPassed: boolean;
  isServingNow: boolean;
  isBeforeServing: boolean;
  isAfterServing: boolean;
  statusBadgeText: string;
  statusBadgeColor: "emerald" | "blue" | "amber" | "slate" | "rose";
  theme: MealWindowConfig["theme"];
}

/**
 * Computes exact serving window status relative to the current authoritative clock
 */
export function getMealTimingDetails(
  mealType: string,
  mealDateString: string,
  now: Date
): MealStatusDetails {
  const config = MEAL_TIMINGS[mealType] || MEAL_TIMINGS.LUNCH;
  const [year, month, day] = (mealDateString || "").split("-").map(Number);

  const baseYear = year || now.getFullYear();
  const baseMonth = month ? month - 1 : now.getMonth();
  const baseDay = day || now.getDate();

  const cutoffTime = new Date(baseYear, baseMonth, baseDay, config.cutoffHour, config.cutoffMinute, 0);
  const startTime = new Date(baseYear, baseMonth, baseDay, config.startHour, config.startMinute, 0);
  const endTime = new Date(baseYear, baseMonth, baseDay, config.endHour, config.endMinute, 0);

  const nowMs = now.getTime();
  const isCutoffPassed = nowMs >= cutoffTime.getTime();
  const isServingNow = nowMs >= startTime.getTime() && nowMs <= endTime.getTime();
  const isBeforeServing = nowMs < startTime.getTime();
  const isAfterServing = nowMs > endTime.getTime();

  let statusBadgeText = "";
  let statusBadgeColor: "emerald" | "blue" | "amber" | "slate" | "rose" = "slate";

  if (isServingNow) {
    statusBadgeText = "Serving Active Now";
    statusBadgeColor = "emerald";
  } else if (isBeforeServing) {
    statusBadgeText = `Serving starts at ${formatTimeShort(startTime)}`;
    statusBadgeColor = "blue";
  } else {
    statusBadgeText = "Serving Ended";
    statusBadgeColor = "slate";
  }

  return {
    timingLabel: config.timingLabel,
    cutoffLabel: config.cutoffLabel,
    isCutoffPassed,
    isServingNow,
    isBeforeServing,
    isAfterServing,
    statusBadgeText,
    statusBadgeColor,
    theme: config.theme,
  };
}

export function parseMenuItems(menuString: string): string[] {
  if (!menuString) return [];
  if (menuString.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(menuString);
      if (Array.isArray(parsed.VEG)) return parsed.VEG;
      if (typeof parsed.VEG === "string") return parseMenuItems(parsed.VEG);
    } catch {}
  }
  return menuString
    .split(/[,&]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Formats remaining time before preparation cutoff deadline.
 * Returns "Cutoff Locked" when deadline has elapsed.
 */
export function formatCountdownText(cutoffIso: string, now: Date): string {
  const diff = new Date(cutoffIso).getTime() - now.getTime();
  if (diff <= 0) return "Cutoff Locked";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}h ${m}m ${s}s left`;
}

function formatTimeShort(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
