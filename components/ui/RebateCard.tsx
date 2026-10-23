"use client";

import { Wallet, Sparkles } from "lucide-react";

interface RebateCardProps {
  baseMonthlyFee: number;
  optedOutCount: number;
  totalRebate: number;
}

export default function RebateCard({
  baseMonthlyFee,
  optedOutCount,
  totalRebate,
}: RebateCardProps) {
  const netPayable = Math.max(0, baseMonthlyFee - totalRebate);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-pink-600 dark:text-pink-400" />{" "}
          Automated Rebate Billing & Monthly Statement
        </h2>
        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1 border border-emerald-100 dark:border-emerald-900">
          <Sparkles className="w-3.5 h-3.5" /> Live Ledger Synced
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
            Base Monthly Mess Fee
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
            ₹{baseMonthlyFee}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
            Standard hostel advance
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
          <p className="text-xs text-amber-700 dark:text-amber-400 uppercase font-semibold">
            Verified Opt-Out Rebate
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            - ₹{totalRebate}
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            {optedOutCount} meal(s) opted out prior to cutoff
          </p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
          <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-semibold">
            Net Payable Mess Bill
          </p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            ₹{netPayable}
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
            Auto-adjusted statement balance
          </p>
        </div>
      </div>
    </div>
  );
}
