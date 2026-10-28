"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { THEME } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Logo from "@/components/ui/Logo";
import {
  LogIn,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials, currentUser, loading } = useAuth();
  const [loginIdInput, setLoginIdInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If already authenticated, redirect immediately to the user's role portal
  useEffect(() => {
    if (!loading && currentUser) {
      const routes: Record<string, string> = {
        STUDENT: "/student",
        STAFF: "/staff",
        ADMIN: "/admin",
      };
      router.replace(routes[currentUser.role] || "/student");
    }
  }, [currentUser, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdInput.trim()) return;
    if (!passwordInput) {
      setLoginError("Please enter your account password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    const res = await loginWithCredentials(loginIdInput.trim(), passwordInput);
    setIsLoggingIn(false);

    if (res.success && res.user) {
      const routes: Record<string, string> = {
        STUDENT: "/student",
        STAFF: "/staff",
        ADMIN: "/admin",
      };
      router.push(routes[res.user.role] || "/student");
    } else {
      setLoginError(res.error || "Invalid Login ID or password. Please verify your credentials.");
    }
  };

  return (
    <AppShell
      badge="Authentication"
      title="Institutional Portal Sign In"
      description="Enter your Login ID or registered college email address and password to access your dining dashboard"
    >
      <div className="max-w-md mx-auto py-6">
        <div className={`${THEME.card} p-7 space-y-6 shadow-sm`}>
          <div className="text-center flex flex-col items-center justify-center space-y-2">
            <Logo variant="full" size="lg" />
            <p className="text-xs text-[#777064]">
              MNNIT Allahabad Hostel Dining &amp; Management Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs sm:text-sm font-bold text-[#252820]">
                Login ID or College Email
              </label>
              <input
                type="text"
                value={loginIdInput}
                onChange={(e) => setLoginIdInput(e.target.value)}
                placeholder="e.g. warden, staff1, or 20253137@mnnit.ac.in"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                autoComplete="username"
                className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-colors font-medium"
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
                  autoComplete="current-password"
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
              disabled={isLoggingIn || !loginIdInput.trim() || !passwordInput}
              className="w-full py-2.5 sm:py-3 bg-[#244C3B] hover:bg-[#1B3A2D] text-white font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {isLoggingIn ? "Verifying Credentials..." : "Sign In to Portal"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          <div className="pt-3 border-t border-[#E5E1D8] space-y-2 text-center text-xs text-[#777064]">
            <div>
              New resident student?{" "}
              <Link href="/register" className="text-[#244C3B] font-bold hover:underline">
                Register here
              </Link>
            </div>
            <p className="text-[11px] text-[#777064]/80 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#244C3B]" />
              Staff and Warden accounts are provisioned by the Chief Warden Office.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
