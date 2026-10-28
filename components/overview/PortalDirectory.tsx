"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ScanLine,
  ChartNoAxesCombined,
  ArrowRight,
  ChefHat,
} from "lucide-react";
import { THEME } from "@/lib/theme";

export default function PortalDirectory() {
  const portals = [
    {
      title: "Student Dining Portal",
      role: "STUDENT",
      href: "/student",
      icon: CalendarDays,
      desc: "View daily meal schedules, manage attendance before preparation cutoffs, review monthly fee rebates, and access your meal pass.",
      features: ["Daily Meal Schedules", "Meal Opt-In & Opt-Out", "Monthly Rebate Statement"],
    },
    {
      title: "Staff Entry Scanner",
      role: "STAFF",
      href: "/staff",
      icon: ScanLine,
      desc: "Dining hall entry terminal for mess staff to check in residents and verify valid meal passes during serving hours.",
      features: ["Dining Hall Check-In", "Pass Verification", "Real-Time Entry Logging"],
    },
    {
      title: "Kitchen Admin & Operations",
      role: "ADMIN",
      href: "/admin",
      icon: ChartNoAxesCombined,
      desc: "Comprehensive mess management console for menu planning, portion forecasting, attendance records, and audit reports.",
      features: ["Daily Headcount Forecasts", "Dietary Quota Overview", "Attendance Ledger & Reports"],
    },
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Role Portal Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-[#252820] text-center sm:text-left flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-[#244C3B]" /> Campus Dining Portals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {portals.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className={`${THEME.card} p-6 sm:p-7 flex flex-col justify-between space-y-4 shadow-xs card-hover-lift group`}
              >
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-[#244C3B]/10 border border-[#244C3B]/20 flex items-center justify-center text-[#244C3B] group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#252820] group-hover:text-[#244C3B] transition-colors">{p.title}</h3>
                    <p className="text-xs sm:text-sm text-[#777064] mt-1.5 leading-relaxed font-medium">
                      {p.desc}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E5E1D8]">
                  <div className="space-y-1.5">
                    {p.features.map((f) => (
                      <div
                        key={f}
                        className="text-xs text-[#777064] flex items-center gap-2 font-medium"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#244C3B] shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={p.href}
                    className="w-full py-2.5 bg-[#FAF7F0] hover:bg-[#244C3B] hover:text-white text-[#252820] text-xs sm:text-sm font-bold rounded-xl border border-[#E5E1D8] hover:border-[#244C3B] flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.98]"
                  >
                    <span>Open Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
