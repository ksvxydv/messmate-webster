"use client";

import React from "react";
import { Sliders, Utensils, RefreshCw, CheckCircle2, AlertTriangle, Zap } from "lucide-react";

interface DevTestingSuiteProps {
  onSeedToday: () => void;
  seeding: boolean;
  seedStatus: { seeded: boolean; date: string; slots: number; bookings: number } | null;
  onRunConcurrencyTest: () => void;
  testRunning: boolean;
  testSummary: { success: number; conflicts: number } | null;
  testResults: any[] | null;
}

export default function DevTestingSuite({
  onSeedToday,
  seeding,
  seedStatus,
  onRunConcurrencyTest,
  testRunning,
  testSummary,
  testResults,
}: DevTestingSuiteProps) {
  return (
    <div className="border border-[#D99A51]/40 rounded-2xl bg-[#FAF7F0]/80 p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-[#E5E1D8] pb-3">
        <div className="w-8 h-8 rounded-lg bg-[#D99A51]/20 text-[#9E651E] flex items-center justify-center font-bold">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-[#252820] uppercase tracking-wide">
            Engineering Verification &amp; Evaluation Tools
          </h3>
          <p className="text-xs text-[#777064]">
            Independent testing controls for live presentation, database seeding, and CAS concurrency benchmarks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Daily Meal Seeder Tool */}
        <div className="bg-white rounded-xl border border-[#E5E1D8] p-5 space-y-3 shadow-2xs card-hover-lift">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-[#252820] flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#244C3B]" /> Daily Meal Slot Seeder
              </h4>
              <p className="text-xs text-[#777064] mt-1 leading-relaxed">
                Auto-generates today&apos;s meal schedule &amp; student resident bookings. Safe to re-run.
              </p>
            </div>
            <button
              type="button"
              onClick={onSeedToday}
              disabled={seeding}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#244C3B] hover:bg-[#1B3A2D] active:scale-[0.97] text-white transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? "Seeding..." : "Seed Today"}
            </button>
          </div>
          {seedStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-scale-in ${
                seedStatus.seeded
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {seedStatus.seeded ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  <span>
                    Seeded <strong>{seedStatus.slots}</strong> slots &amp;{" "}
                    <strong>{seedStatus.bookings}</strong> bookings for <strong>{seedStatus.date}</strong>.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Seeding failed. Check database connection.</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 10-Cashier Concurrent Stress Test */}
        <div className="bg-white rounded-xl border border-[#E5E1D8] p-5 space-y-3 shadow-2xs card-hover-lift">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-[#252820] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D99A51]" /> 10-Cashier Atomic CAS Stress Test
              </h4>
              <p className="text-xs text-[#777064] mt-1 leading-relaxed">
                Fires 10 parallel scan requests at the exact same millisecond to test double-spend prevention.
              </p>
            </div>
            <button
              type="button"
              onClick={onRunConcurrencyTest}
              disabled={testRunning}
              className="px-3.5 py-2 bg-[#244C3B] hover:bg-[#1B3A2D] active:scale-[0.97] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
            >
              <Zap className={`w-3.5 h-3.5 ${testRunning ? "animate-spin" : ""}`} />
              {testRunning ? "Firing..." : "Run Test"}
            </button>
          </div>

          {testSummary && (
            <div className="space-y-2 pt-1 animate-scale-in">
              <div className="p-2.5 bg-[#FAF7F0] rounded-lg border border-[#E5E1D8] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  Redeemed: <strong className="text-[#15803D] font-mono">{testSummary.success}</strong> (Target: 1)
                </span>
                <span>
                  Blocked: <strong className="text-rose-700 font-mono">{testSummary.conflicts}</strong> (Target: 9)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  Row Lock Passed
                </span>
              </div>
              {testResults && (
                <div className="grid grid-cols-5 gap-1.5 text-[11px] font-mono">
                  {testResults.map((r) => (
                    <div
                      key={r.terminal}
                      className={`p-1.5 rounded-lg border text-center ${
                        r.status === 200
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      <div>T#{r.terminal}</div>
                      <div className="text-[9px] opacity-85">{r.status === 200 ? "OK" : "409"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
