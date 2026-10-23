"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Utensils, User, Camera, BarChart3, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const pathname = usePathname();
  const { role, setRole } = useAuth();

  const navItems = [
    { name: "Overview", href: "/", icon: Utensils },
    { name: "Student Portal", href: "/student", icon: User },
    { name: "Staff QR Scanner", href: "/staff", icon: Camera },
    { name: "Admin Analytics", href: "/admin", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-md border-b border-gray-800 font-sans transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-pink-600 flex items-center justify-center text-white shadow-sm">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">
              MessMate
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-pink-950/50 text-pink-400 rounded-full border border-pink-900">
              E2: Kamar-Taj
            </span>
          </div>
        </Link>

        {/* Role Switcher Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-gray-800 text-pink-400 shadow-sm"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Active Role Selector + Security Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-gray-900 p-1 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 px-2 hidden sm:inline">
              Role:
            </span>
            {["STUDENT", "STAFF", "ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  role === r
                    ? "bg-pink-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>HMAC-SHA256</span>
          </div>
        </div>
      </div>
    </header>
  );
}
