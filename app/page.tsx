"use client";

import Link from "next/link";
import {
  Utensils,
  User,
  Camera,
  BarChart3,
  ShieldCheck,
  Clock,
  WifiOff,
  Lock,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const portals = [
    {
      title: "Student Sanctum Portal",
      role: "ROLE: STUDENT",
      href: "/student",
      icon: User,
      color: "bg-pink-600",
      badgeBg:
        "bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-900",
      description:
        "Toggle daily meal opt-ins/opt-outs before preparation cutoffs, switch between demo student profiles, generate 30s rotating HMAC QR passes, and track monthly mess rebate deductions.",
      features: [
        "Live Server-Synced Cutoff Timers",
        "30s Rotating HMAC-SHA256 QR Pass",
        "Automated Monthly Rebate Statement",
      ],
    },
    {
      title: "Refectory Staff Scanner",
      role: "ROLE: MESS STAFF",
      href: "/staff",
      icon: Camera,
      color: "bg-gray-900 dark:bg-gray-800",
      badgeBg:
        "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700",
      description:
        "High-speed camera & image QR verification terminal. Enforces single-redemption atomic check-ins and seamlessly queues scans in browser IndexedDB when mess hall Wi-Fi drops.",
      features: [
        "Sub-100ms QR Signature Validation",
        "Zero Double-Spend Atomic SQL Lock",
        "Offline IndexedDB Queue & Batch Sync",
      ],
    },
    {
      title: "Admin & Kitchen Analytics",
      role: "ROLE: MESS MANAGER",
      href: "/admin",
      icon: BarChart3,
      color: "bg-blue-600",
      badgeBg:
        "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900",
      description:
        "Real-time kitchen head-count forecasting, dietary preference breakdown, Projected vs. Consumed food waste charts, surplus redistribution alerts, and CSV audit exports.",
      features: [
        "Locked Kitchen Head-Count Forecast",
        "Projected vs. Consumed Waste Charts",
        "Surplus Food Redistribution Alerts",
      ],
    },
  ];

  const architecturePillars = [
    {
      icon: Clock,
      title: "Atomic Cutoff State Machine",
      desc: "Strict OPEN → LOCKED → CONSUMED transitions validated against PostgreSQL server time to prevent client clock tampering.",
    },
    {
      icon: ShieldCheck,
      title: "Cryptographic QR Tokens",
      desc: "Time-windowed (30s) HMAC-SHA256 signatures rendered via Web Crypto API so static screenshots expire immediately.",
    },
    {
      icon: Lock,
      title: "Zero Double-Spend Ledger",
      desc: "Single-statement conditional SQL updates lock target booking rows atomically, blocking concurrent double-dipping.",
    },
    {
      icon: WifiOff,
      title: "Offline-First PWA Queue",
      desc: "IndexedDB local storage queues verified check-ins during dining hall network drops and syncs upon reconnection.",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans py-10 px-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Banner */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-800 text-center space-y-5 transition-colors">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-900 text-pink-600 dark:text-pink-400 text-xs font-bold uppercase tracking-wider">
            <Utensils className="w-3.5 h-3.5" /> CodeSangam Webster 2026 • Track
            E2
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            The Kamar-Taj Refectory{" "}
            <span className="text-pink-600 dark:text-pink-400">
              Resource Engine
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-gray-500 dark:text-gray-400 text-sm md:text-base leading-relaxed">
            A predictive institutional mess management platform with
            deterministic meal cutoff state machines, dynamic rebate accounting,
            and cryptographic single-redemption QR check-ins.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/student"
              className="px-6 py-3 rounded-xl bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700 shadow-sm flex items-center gap-2 transition-all"
            >
              Launch Student Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/staff"
              className="px-6 py-3 rounded-xl bg-gray-900 dark:bg-gray-800 text-white text-sm font-semibold hover:bg-gray-800 shadow-sm flex items-center gap-2 transition-all"
            >
              Open Staff QR Scanner <Camera className="w-4 h-4" />
            </Link>
            <Link
              href="/admin"
              className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-all"
            >
              View Admin Analytics <BarChart3 className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Role Selection Cards */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Role-Based Access Portals
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Select a portal below to test end-to-end workflows across all
                three institutional roles
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-pink-200 dark:hover:border-pink-900 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-11 h-11 rounded-xl ${portal.color} text-white flex items-center justify-center shadow-sm`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${portal.badgeBg}`}
                      >
                        {portal.role}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      {portal.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      {portal.description}
                    </p>

                    <ul className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                      {portal.features.map((feat) => (
                        <li
                          key={feat}
                          className="text-xs text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-3 flex items-center text-xs font-bold text-pink-600 dark:text-pink-400 group-hover:translate-x-1 transition-transform">
                    Enter Portal <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Core Engineering Pillars */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Core Engineering & Victory Tier Architecture
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Built to eliminate TOCTOU double-spend race conditions, screenshot
            pass sharing, and dining hall Wi-Fi drop-offs
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {architecturePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800"
                >
                  <Icon className="w-5 h-5 text-pink-600 dark:text-pink-400 mb-2.5" />
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
