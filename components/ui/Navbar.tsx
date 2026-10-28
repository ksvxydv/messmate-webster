"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ScanLine,
  ChartNoAxesCombined,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/ui/Logo";

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

  // Role-appropriate navigation links
  const navItems = [
    { name: "Overview", shortName: "Overview", href: "/", icon: LayoutDashboard },
  ];

  if (currentUser?.role === "STUDENT") {
    navItems.push({
      name: "Student Dining",
      shortName: "Dining",
      href: "/student",
      icon: CalendarDays,
    });
  } else if (currentUser?.role === "STAFF") {
    navItems.push({
      name: "Staff Scanner",
      shortName: "Scanner",
      href: "/staff",
      icon: ScanLine,
    });
  } else if (currentUser?.role === "ADMIN") {
    navItems.push(
      {
        name: "Kitchen Admin",
        shortName: "Admin",
        href: "/admin",
        icon: ChartNoAxesCombined,
      },
      {
        name: "Staff Scanner",
        shortName: "Scanner",
        href: "/staff",
        icon: ScanLine,
      }
    );
  }

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

        {/* Right Section: User Session & Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col text-right leading-tight">
                <span className="text-xs font-bold text-[#252820] truncate max-w-[140px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-[#777064] uppercase font-bold tracking-wider">
                  {currentUser.role === "STUDENT"
                    ? "Resident Student"
                    : currentUser.role === "STAFF"
                    ? "Mess Staff"
                    : "Chief Warden"}
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
            <div className="flex items-center gap-2">
              <Link
                href="/register"
                className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-xs font-semibold text-[#244C3B] hover:bg-[#FAF7F0] border border-[#244C3B]/20 transition-all"
              >
                Register
              </Link>
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#244C3B] hover:bg-[#1B3A2D] text-white shadow-xs transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar (below md breakpoint) */}
      {navItems.length > 1 && (
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
      )}
    </header>
  );
}
