"use client";

import React, { useState } from "react";
import { Truck, HeartHandshake, X, Check } from "lucide-react";
import { THEME } from "@/lib/theme";

interface SurplusDispatchBannerProps {
  totalSurplus: number;
}

export default function SurplusDispatchBanner({
  totalSurplus,
}: SurplusDispatchBannerProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedNGO, setSelectedNGO] = useState("Robin Hood Army (Prayagraj Chapter)");
  const [dispatchPortions, setDispatchPortions] = useState(totalSurplus);
  const [dispatchConfirmed, setDispatchConfirmed] = useState(false);

  if (totalSurplus <= 0) return null;

  return (
    <>
      <div className="p-4 sm:p-5 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#B45309] flex items-center justify-center shrink-0 border border-amber-300">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-[#92400E] text-sm sm:text-base">
              Surplus Redistribution Alert ({totalSurplus} Cooked Portions)
            </h4>
            <p className="text-[#78350F] text-xs mt-0.5">
              Unclaimed cooked meals ready for verified campus NGO partner redistribution.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDispatchPortions(totalSurplus);
            setShowModal(true);
            setDispatchConfirmed(false);
          }}
          className="px-4 py-2 bg-[#D99A51] hover:bg-[#C5863D] text-white font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
        >
          <HeartHandshake className="w-4 h-4" />
          <span>Dispatch to NGO</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#E5E1D8] relative space-y-4 modal-content">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[#777064] hover:text-[#252820] bg-[#FAF7F0] p-2 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center border border-amber-200">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-[#252820]">Dispatch Surplus Meals</h4>
                <p className="text-xs text-[#777064]">Campus Redistribution &amp; NGO Network</p>
              </div>
            </div>

            {!dispatchConfirmed ? (
              <div className="space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="text-[#252820] font-bold block mb-1.5">Select Partner NGO:</label>
                  <select
                    value={selectedNGO}
                    onChange={(e) => setSelectedNGO(e.target.value)}
                    className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl p-2.5 text-[#252820] focus:outline-none"
                  >
                    <option>Robin Hood Army (Prayagraj Chapter)</option>
                    <option>Annakshetra Food Foundation</option>
                    <option>Prayagraj Rain Basera Night Shelter</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#252820] font-bold block mb-1.5">Portions to Dispatch:</label>
                  <input
                    type="number"
                    value={dispatchPortions}
                    onChange={(e) => setDispatchPortions(Number(e.target.value))}
                    max={totalSurplus}
                    className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl p-2.5 text-[#252820] font-mono text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchConfirmed(true)}
                  className="w-full py-3 bg-[#D99A51] hover:bg-[#C5863D] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-xs"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" /> Issue Dispatch Manifest
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#15803D] flex items-center justify-center mx-auto border border-emerald-200">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h4 className="text-base font-bold text-[#252820]">Manifest Issued!</h4>
                <p className="text-xs text-[#777064]">
                  {dispatchPortions} surplus meals assigned to <strong className="text-[#252820]">{selectedNGO}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={THEME.btnSecondary + " mx-auto"}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
