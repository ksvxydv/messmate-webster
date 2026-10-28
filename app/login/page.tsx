"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { THEME } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Logo from "@/components/ui/Logo";
import {
  CalendarDays,
  ScanLine,
  ChartNoAxesCombined,
  LogIn,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials, loginAsRole, isDemoEnabled } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    if (!passwordInput) {
      setLoginError("Please enter your account password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    const res = await loginWithCredentials(emailInput, passwordInput);
    setIsLoggingIn(false);

    if (res.success && res.user) {
      const routes = { STUDENT: "/student", STAFF: "/staff", ADMIN: "/admin" };
      router.push(routes[res.user.role]);
    } else {
      setLoginError(res.error || "Login failed. Please verify your credentials.");
    }
  };

  const handleQuickPersona = async (targetRole: "STUDENT" | "STAFF" | "ADMIN") => {
    const user = await loginAsRole(targetRole);
    if (user) {
      const routes = { STUDENT: "/student", STAFF: "/staff", ADMIN: "/admin" };
      router.push(routes[targetRole]);
    }
  };

  return (
    <AppShell
      badge="Authentication"
      title="Institutional Portal Sign In"
      description="Enter your authorized college email address and password to access your dining dashboard"
    >
      <div className="max-w-md mx-auto py-6">
        <div className={`${THEME.card} p-7 space-y-6 shadow-sm`}>
          <div className="text-center flex flex-col items-center justify-center space-y-2">
            <Logo variant="full" size="lg" />
            <p className="text-xs text-[#777064]">
              MNNIT Allahabad Hostel Dining &amp; Management Portal
            </p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs sm:text-sm font-bold text-[#252820]">
                College Email Address
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="e.g. 20253137@mnnit.ac.in"
                required
                className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-colors"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs sm:text-sm font-bold text-[#252820]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your account password"
                  required
                  className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777064] hover:text-[#252820] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !emailInput.trim() || !passwordInput}
              className="w-full py-2.5 sm:py-3 bg-[#244C3B] hover:bg-[#1B3A2D] text-white font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {isLoggingIn ? "Authenticating..." : "Continue to Portal"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          {/* Development / Testing Quick Persona Access */}
          {isDemoEnabled && (
            <div className="pt-4 border-t border-[#E5E1D8] space-y-2.5">
              <p className="text-xs text-[#777064] font-bold text-center">
                Development Role Access (Dev Mode):
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickPersona("STUDENT")}
                  className="px-3.5 py-1.5 bg-[#FAF7F0] hover:bg-[#F0ECE1] text-[#252820] text-xs font-bold rounded-xl border border-[#E5E1D8] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-[#244C3B]" /> Student
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPersona("STAFF")}
                  className="px-3.5 py-1.5 bg-[#FAF7F0] hover:bg-[#F0ECE1] text-[#252820] text-xs font-bold rounded-lg border border-[#E5E1D8] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ScanLine className="w-3.5 h-3.5 text-emerald-700" /> Staff
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPersona("ADMIN")}
                  className="px-3.5 py-1.5 bg-[#FAF7F0] hover:bg-[#F0ECE1] text-[#252820] text-xs font-bold rounded-lg border border-[#E5E1D8] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChartNoAxesCombined className="w-3.5 h-3.5 text-[#D99A51]" /> Admin
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 text-center text-xs text-[#777064]">
            New resident?{" "}
            <Link href="/" className="text-[#244C3B] font-bold hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
