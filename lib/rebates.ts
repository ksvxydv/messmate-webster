// Pure Domain Functions for MessMate Monthly Fee & Rebate Calculations

export interface RebateCalculationResult {
  totalRebateCredit: number;
  netPayable: number;
  optedOutCount: number;
}

export const DEFAULT_BASE_MONTHLY_FEE = 4500;
export const DEFAULT_MEAL_UNIT_COST = 50;

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
