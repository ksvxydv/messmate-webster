// Pure Domain Functions for MessMate Monthly Fee & Rebate Calculations

import type { RebateCalculationResult } from "../types/index.ts";
import { DEFAULT_BASE_MONTHLY_FEE, DEFAULT_MEAL_UNIT_COST, INSTITUTIONAL_TIMEZONE } from "../config/constants.ts";

export { DEFAULT_BASE_MONTHLY_FEE, DEFAULT_MEAL_UNIT_COST };
export type { RebateCalculationResult };

export interface BillingPeriod {
  billingMonth: string;
  startDate: string;
  endDate: string;
  year: number;
  month: number;
}

/**
 * Computes billing month label and calendar boundaries in Asia/Kolkata time.
 * Supports explicit YYYY-MM or falls back to reference date.
 */
export function computeBillingPeriod(
  referenceDate: Date = new Date(),
  monthParam?: string | null
): BillingPeriod {
  let year: number;
  let month: number; // 1-12

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m;
  } else {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: INSTITUTIONAL_TIMEZONE,
      year: "numeric",
      month: "numeric",
    }).formatToParts(referenceDate);
    year = Number(parts.find((p) => p.type === "year")?.value || referenceDate.getFullYear());
    month = Number(parts.find((p) => p.type === "month")?.value || referenceDate.getMonth() + 1);
  }

  const monthDate = new Date(Date.UTC(year, month - 1, 1));
  const billingMonth = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: INSTITUTIONAL_TIMEZONE,
  }).format(monthDate);

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { billingMonth, startDate, endDate, year, month };
}

/**
 * Calculates rebate credits and net payable amount for a hostel resident.
 * Ensures monetary precision and prevents negative net payable amounts.
 */
export function calculateRebates(
  baseMonthlyFee: number = DEFAULT_BASE_MONTHLY_FEE,
  optedOutItems: Array<{ unitCost?: number | null }> = []
): RebateCalculationResult {
  const totalRebateCredit = optedOutItems.reduce((sum, item) => {
    const cost = Number(item.unitCost ?? DEFAULT_MEAL_UNIT_COST);
    return sum + (isNaN(cost) || cost < 0 ? DEFAULT_MEAL_UNIT_COST : cost);
  }, 0);

  const netPayable = Math.max(0, baseMonthlyFee - totalRebateCredit);

  return {
    totalRebateCredit,
    netPayable,
    optedOutCount: optedOutItems.length,
  };
}
