"use client";

import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ScanLine,
  Clock3,
  Drumstick,
  Wheat,
  Leaf,
} from "lucide-react";
import { THEME } from "@/lib/theme";

interface ScanResultCardProps {
  scanStatus: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
  subMessage: string | null;
  scanResult: any;
}

export default function ScanResultCard({
  scanStatus,
  message,
  subMessage,
  scanResult,
}: ScanResultCardProps) {
  return (
    <div className="space-y-4">
      {/* Live Feedback Card */}
      <div
        className={`p-6 rounded-3xl border transition-all shadow-sm ${
          scanStatus === "SUCCESS"
            ? "bg-emerald-50 border-emerald-300 text-emerald-950"
            : scanStatus === "ERROR"
              ? "bg-rose-50 border-rose-300 text-rose-950"
              : `${THEME.card}`
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-0.5">
            {scanStatus === "SUCCESS" && (
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-300 shadow-2xs">
                <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
              </div>
            )}
            {scanStatus === "ERROR" && (
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center border border-rose-300 shadow-2xs">
                <ShieldAlert className="w-7 h-7 stroke-[2.2]" />
              </div>
            )}
            {scanStatus === "IDLE" && (
              <div className="w-12 h-12 rounded-2xl bg-[#FAF7F0] text-[#777064] flex items-center justify-center border border-[#E5E1D8]">
                <ScanLine className="w-6 h-6 stroke-[2]" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-black text-base sm:text-lg tracking-tight">{message}</h3>
            {subMessage && (
              <p className="text-xs sm:text-sm font-semibold leading-relaxed opacity-90">
                {subMessage}
              </p>
            )}
          </div>
        </div>

        {scanResult?.users && (
          <div className="mt-4 pt-4 border-t border-[#E5E1D8] space-y-3 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3.5 rounded-xl border border-[#E5E1D8]">
                <span className="text-[#777064] text-[11px] uppercase font-bold block">
                  Student
                </span>
                <span className="text-[#252820] font-black text-sm sm:text-base">
                  {scanResult.users.name}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-[#E5E1D8]">
                <span className="text-[#777064] text-[11px] uppercase font-bold block">
                  Registration No
                </span>
                <span className="text-[#252820] font-mono font-black text-sm sm:text-base">
                  {scanResult.users.reg_no}
                </span>
              </div>
            </div>

            {/* Mess Counter Plate Alert with Lucide Iconography */}
            <div
              className={`p-3.5 rounded-xl border text-center font-black text-xs sm:text-sm uppercase tracking-wide shadow-2xs flex items-center justify-center gap-2 ${
                scanResult.users.dietary_pref === "NON_VEG"
                  ? "bg-rose-100 border-rose-300 text-rose-900"
                  : scanResult.users.dietary_pref === "JAIN"
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "bg-emerald-100 border-emerald-300 text-emerald-900"
              }`}
            >
              {scanResult.users.dietary_pref === "NON_VEG" && (
                <>
                  <Drumstick className="w-4 h-4 stroke-[2.2]" />
                  <span>Serve Non-Veg Plate</span>
                </>
              )}
              {scanResult.users.dietary_pref === "JAIN" && (
                <>
                  <Wheat className="w-4 h-4 stroke-[2.2]" />
                  <span>Serve Jain Meal (No Onion / Garlic)</span>
                </>
              )}
              {scanResult.users.dietary_pref === "VEG" && (
                <>
                  <Leaf className="w-4 h-4 stroke-[2.2]" />
                  <span>Serve Vegetarian Plate</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Security Architecture Guard */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5E1D8] text-xs sm:text-sm text-[#777064] flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#244C3B]/10 text-[#244C3B] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-bold text-[#252820] text-xs block">
              Atomic Check-In Protection
            </span>
            <span className="text-[11px] text-[#777064]">
              Real-time concurrency lock prevents duplicate passes
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Anti-Duplicate Guard
        </span>
      </div>
    </div>
  );
}
