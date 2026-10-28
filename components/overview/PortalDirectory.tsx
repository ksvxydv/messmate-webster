"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ScanLine,
  ChartNoAxesCombined,
  Clock3,
  QrCode,
  ShieldCheck,
  WifiOff,
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
      desc: "Manage daily meal attendance, opt out before preparation deadlines for automated fee rebates, and access rotating 30s QR passes during dining hours.",
      features: ["Deadline Countdown Timers", "Active Meal QR Passes", "Automated Monthly Rebates"],
    },
    {
      title: "Staff Entry Scanner",
      role: "STAFF",
      href: "/staff",
      icon: ScanLine,
      desc: "High-speed camera check-in terminal for dining hall staff. Enforces atomic Compare-and-Swap single-use validation and queues scans when Wi-Fi drops.",
      features: ["Sub-50ms Verification", "Anti-Double-Scan Protection", "Offline Queue & Auto-Sync"],
    },
    {
      title: "Kitchen Admin & Analytics",
      role: "ADMIN",
      href: "/admin",
      icon: ChartNoAxesCombined,
      desc: "Real-time kitchen head-count forecasts, dietary breakdown, food waste telemetry, surplus redistribution alerts, and CSV audit ledger exports.",
      features: ["Kitchen Prep Headcounts", "Verified Consumption Tracking", "Surplus Redistribution"],
    },
  ];

  const pillars = [
    {
      icon: Clock3,
      title: "Preparation Deadlines",
      desc: "Cutoff times lock attendance before cooking begins, giving the kitchen exact portion numbers to eliminate food waste.",
    },
    {
      icon: QrCode,
      title: "Scheduled QR Access",
      desc: "Meal entry passes activate strictly during dining serving hours with rotating cryptographic signatures.",
    },
    {
      icon: ShieldCheck,
      title: "Single-Use Verification",
      desc: "Atomic database locking guarantees each meal pass can only be redeemed once.",
    },
    {
      icon: WifiOff,
      title: "Offline Continuity",
      desc: "Staff terminals verify and queue entries locally even if campus Wi-Fi drops during rush hour.",
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

      {/* Key Dining Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {pillars.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className={`${THEME.subCard} p-4 sm:p-5 space-y-2`}>
              <Icon className="w-5 h-5 text-[#244C3B]" />
              <h4 className="text-sm font-bold text-[#252820]">{item.title}</h4>
              <p className="text-xs text-[#777064] leading-relaxed font-medium">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
