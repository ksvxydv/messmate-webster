"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import LiveMenuPreview from "@/components/overview/LiveMenuPreview";
import AuthPortalCard from "@/components/overview/AuthPortalCard";
import PortalDirectory from "@/components/overview/PortalDirectory";
import { UtensilsCrossed } from "lucide-react";

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
      <section className="text-center space-y-2.5 pt-1 pb-1 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#244C3B]/10 text-[#244C3B] text-xs font-bold border border-[#244C3B]/20 shadow-2xs">
          <UtensilsCrossed className="w-3.5 h-3.5 text-[#D99A51]" />
          <span>MNNIT Central Dining Facility • Hostel Mess System</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-black text-[#252820] tracking-tight leading-snug max-w-xl mx-auto">
          Hostel Mess Management &amp; Dining Platform
        </h1>

        <p className="text-xs sm:text-sm text-[#777064] leading-relaxed max-w-lg mx-auto font-medium">
          Centralized meal scheduling, automated opt-out rebates, and secure dining hall entry for MNNIT Allahabad.
        </p>
      </section>

      {/* Main Grid: Today's Menu Highlight + Sign In / Register Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Today's Live Mess Menu Card */}
        <div className="lg:col-span-7">
          <LiveMenuPreview todayMeals={todayMeals} />
        </div>

        {/* Right Side: Authentication & Student Registration Card */}
        <div className="lg:col-span-5">
          <AuthPortalCard />
        </div>
      </div>

      {/* Campus Dining Portals & Architectural Pillars */}
      <PortalDirectory />
    </AppShell>
  );
}
