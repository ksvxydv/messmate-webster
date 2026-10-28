"use client";

import { useState } from "react";
import { Wallet, ReceiptText, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { THEME } from "@/lib/theme";

interface RebateCardProps {
  baseMonthlyFee: number;
  optedOutCount: number;
  totalRebate: number;
  rebateItems?: Array<{
    id: string;
    mealType: string;
    mealDate: string;
    unitCost: number;
  }>;
}

export default function RebateCard({
  baseMonthlyFee,
  optedOutCount,
  totalRebate,
  rebateItems = [],
}: RebateCardProps) {
  const [showLedger, setShowLedger] = useState(false);
  const netPayable = Math.max(0, baseMonthlyFee - totalRebate);

  return (
    <div className={`${THEME.card} p-6 sm:p-7 space-y-6 shadow-xs`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
        <div>
          <h3 className="text-lg font-black text-[#252820] flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#244C3B]" /> Monthly Mess Fee &amp; Rebate Ledger
          </h3>
          <p className="text-sm text-[#777064] mt-1 leading-relaxed">
            Meals skipped prior to cutoff deadlines are automatically credited to reduce your hostel mess fee.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {rebateItems.length > 0 && (
            <button
              onClick={() => setShowLedger(!showLedger)}
              className={THEME.btnSecondary}
            >
              <ReceiptText className="w-4 h-4 text-[#244C3B]" />
              <span>{showLedger ? "Hide Statement" : "View Statement"}</span>
              {showLedger ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${THEME.subCard} space-y-1.5 p-5 card-hover-lift`}>
          <span className="text-xs text-[#777064] font-bold uppercase tracking-wider block">
            Base Monthly Mess Advance
          </span>
          <p className="text-2xl sm:text-3xl font-black text-[#252820]">
            ₹{baseMonthlyFee.toLocaleString()}
          </p>
          <p className="text-xs text-[#777064]">Standard institutional monthly fee</p>
        </div>

        <div className="bg-[#FFFBEB] rounded-xl border border-[#FDE68A] p-5 space-y-1.5 card-hover-lift">
          <span className="text-xs text-[#92400E] font-bold uppercase tracking-wider block">
            Verified Pre-Cutoff Credits
          </span>
          <p className="text-2xl sm:text-3xl font-black text-[#B45309]">
            - ₹{totalRebate.toLocaleString()}
          </p>
          <p className="text-xs text-[#78350F]">
            {optedOutCount} meal(s) skipped before cutoff deadline
          </p>
        </div>

        <div className="bg-[#F0FDF4] rounded-xl border border-[#BBF7D0] p-5 space-y-1.5 card-hover-lift">
          <span className="text-xs text-[#166534] font-bold uppercase tracking-wider block">
            Adjusted Net Payable
          </span>
          <p className="text-2xl sm:text-3xl font-black text-[#15803D]">
            ₹{netPayable.toLocaleString()}
          </p>
          <p className="text-xs text-[#14532D]">Calculated after verified opt-out credits</p>
        </div>
      </div>

      {showLedger && rebateItems.length > 0 && (
        <div className="pt-4 border-t border-[#E5E1D8] space-y-3">
          <h4 className="text-sm font-bold text-[#252820] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#244C3B]" />
            Itemized Pre-Cutoff Opt-Out Credits
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#E5E1D8] text-[#777064] text-xs uppercase bg-[#FAF7F0]">
                  <th className="py-3 px-3.5 rounded-l-lg font-bold">Meal Service</th>
                  <th className="py-3 px-3.5 font-bold">Date</th>
                  <th className="py-3 px-3.5 font-bold">Verification Status</th>
                  <th className="py-3 px-3.5 text-right rounded-r-lg font-bold">Rebate Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D8]/60">
                {rebateItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#FAF7F0] transition-colors">
                    <td className="py-3 px-3.5 font-bold text-[#252820]">{item.mealType}</td>
                    <td className="py-3 px-3.5 text-[#777064] font-mono">{item.mealDate}</td>
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Opted Out Before Cutoff
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-[#15803D]">
                      +₹{item.unitCost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
