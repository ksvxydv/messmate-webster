"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ScanLine,
  ChartNoAxesCombined,
  Check,
  LogOut,
  LogIn,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/ui/Logo";
import DevTimeController from "@/components/ui/DevTimeController";

export default function Navbar() {
  const pathname = usePathname();
  const { role, setRole, currentUser, logout, isDemoEnabled } = useAuth();

  const navItems = [
    { name: "Overview", shortName: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Student Dining", shortName: "Dining", href: "/student", icon: CalendarDays },
    { name: "Staff Scanner", shortName: "Scanner", href: "/staff", icon: ScanLine },
    { name: "Kitchen Admin", shortName: "Admin", href: "/admin", icon: ChartNoAxesCombined },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E1D8] font-sans shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Wordmark */}
        <Link
          href="/"
          className="flex items-center group cursor-pointer shrink-0"
          aria-label="MessMate Home"
        >
          <Logo variant="full" size="md" />
        </Link>

        {/* Portal Navigation Links (Desktop: md to 2xl) */}
        <nav
          className="hidden md:flex items-center gap-1 lg:gap-1.5"
          aria-label="Primary Navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-2.5 lg:px-3 py-1.5 rounded-xl text-xs lg:text-sm font-semibold flex items-center gap-1.5 lg:gap-2 transition-all duration-150 active:scale-[0.98] ${
                  isActive
                    ? "bg-[#244C3B] text-white shadow-xs"
                    : "text-[#252820]/75 hover:bg-[#FAF7F0] hover:text-[#252820]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 stroke-[2] shrink-0" />
                <span className="inline lg:hidden">{item.shortName}</span>
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: User Session & Optional Development Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Development-Only Time Controller */}
          {isDemoEnabled && <DevTimeController />}

          {/* Development-Only Role Switcher */}
          {isDemoEnabled && (
            <div
              className="hidden lg:flex items-center bg-[#FAF7F0] p-1 rounded-xl border border-[#E5E1D8]"
              role="group"
              aria-label="Development Demo Persona Switcher"
            >
              <span className="text-[10px] text-[#777064] px-1.5 font-bold uppercase tracking-wider">
                Dev:
              </span>
              {(["STUDENT", "STAFF", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  title={`Switch development role to ${r}`}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    role === r
                      ? "bg-[#244C3B] text-white shadow-xs"
                      : "text-[#777064] hover:text-[#252820] hover:bg-white"
                  }`}
                >
                  {role === r && <Check className="w-3 h-3 stroke-[2.5]" />}
                  <span>{r === "STUDENT" ? "Student" : r === "STAFF" ? "Staff" : "Admin"}</span>
                </button>
              ))}
            </div>
          )}

          {/* Real Authenticated User State */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right leading-tight">
                <span className="text-xs font-bold text-[#252820] truncate max-w-[120px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-[#777064] uppercase font-bold tracking-wider">
                  {currentUser.role === "STUDENT"
                    ? "Resident"
                    : currentUser.role === "STAFF"
                    ? "Staff"
                    : "Warden"}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out of MessMate"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF7F0] hover:bg-rose-50 text-[#777064] hover:text-rose-700 border border-[#E5E1D8] hover:border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#244C3B] hover:bg-[#1B3A2D] text-white shadow-xs transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar (below md breakpoint) */}
      <div className="md:hidden border-t border-[#E5E1D8] bg-[#FAF7F0]/95 px-3 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all min-h-[38px] ${
                isActive
                  ? "bg-[#244C3B] text-white shadow-xs"
                  : "text-[#777064] hover:text-[#252820] hover:bg-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5 stroke-[2]" />
              <span>{item.shortName}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
