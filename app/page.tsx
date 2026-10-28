"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import LiveMenuPreview from "@/components/overview/LiveMenuPreview";
import PortalDirectory from "@/components/overview/PortalDirectory";
import {
  UtensilsCrossed,
  LogIn,
  UserPlus,
  Clock,
  Coins,
  ShieldCheck,
  Building2,
} from "lucide-react";

export default function HomePage() {
  const [todayMeals, setTodayMeals] = useState<any[]>([]);

  useEffect(() => {
    async function loadTodayPreview() {
      try {
        const res = await fetch("/api/meals");
        const data = await res.json();
        if (data.slots) setTodayMeals(data.slots);
      } catch {}
    }
    loadTodayPreview();
  }, []);

  return (
    <AppShell>
      {/* Hero Dining Banner */}
      <section className="text-center space-y-4 pt-2 pb-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#244C3B]/10 text-[#244C3B] text-xs font-bold border border-[#244C3B]/20 shadow-2xs">
          <UtensilsCrossed className="w-3.5 h-3.5 text-[#D99A51]" />
          <span>MNNIT Allahabad • Central Dining Facility &amp; Hostel Mess</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#252820] tracking-tight leading-tight">
          Hostel Mess Management &amp; Dining System
        </h1>

        <p className="text-xs sm:text-sm text-[#777064] leading-relaxed max-w-xl mx-auto font-medium">
          Daily meal schedules, automated opt-out fee rebates, and digital dining hall passes for resident students, mess staff, and wardens.
        </p>

        {/* Clear Call-To-Action Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/login"
            className="px-5 py-2.5 bg-[#244C3B] hover:bg-[#1B3A2D] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Portal</span>
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 bg-white hover:bg-[#FAF7F0] text-[#244C3B] text-xs sm:text-sm font-bold rounded-xl border border-[#244C3B]/30 shadow-2xs transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4 text-[#244C3B]" />
            <span>Register as Student</span>
          </Link>
        </div>
      </section>

      {/* Prominent Daily Menu Highlight */}
      <section className="space-y-4 max-w-4xl mx-auto">
        <LiveMenuPreview todayMeals={todayMeals} />
      </section>

      {/* Public Dining Information & Guidelines */}
      <section className="max-w-4xl mx-auto pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E1D8] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#244C3B]/10 text-[#244C3B] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#252820]">Serving Hours</h3>
            <p className="text-xs text-[#777064] leading-relaxed">
              Breakfast: 7:30 AM – 10:30 AM<br />
              Lunch: 12:00 PM – 2:30 PM<br />
              Dinner: 7:30 PM – 10:00 PM
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E1D8] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#D99A51]/15 text-[#9E651E] flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#252820]">Automated Fee Rebates</h3>
            <p className="text-xs text-[#777064] leading-relaxed">
              Opting out before preparation cutoffs credits ₹40 (Breakfast), ₹80 (Lunch), or ₹60 (Dinner) directly to your monthly fee ledger.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E1D8] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#252820]">Dining Entry Verification</h3>
            <p className="text-xs text-[#777064] leading-relaxed">
              Students present their active dining pass at the cashier counter during serving hours for instant entry check-in.
            </p>
          </div>
        </div>
      </section>

      {/* Campus Dining Portals Directory */}
      <section className="max-w-4xl mx-auto">
        <PortalDirectory />
      </section>
    </AppShell>
  );
}
