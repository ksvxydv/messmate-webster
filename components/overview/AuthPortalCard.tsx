"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { THEME } from "@/lib/theme";
import {
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { DietaryPref } from "@/types";

export default function AuthPortalCard() {
  const router = useRouter();
  const { loginWithCredentials, registerStudent } = useAuth();

  const [activeTab, setActiveTab] = useState<"SIGN_IN" | "REGISTER">("SIGN_IN");

  // Sign In Form State
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regDiet, setRegDiet] = useState<DietaryPref>("VEG");
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

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
      setLoginError(res.error || "Login failed. Please verify your email and password.");
    }
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim()) {
      setRegError("Please enter your full name.");
      return;
    }
    if (!regNo.trim()) {
      setRegError("Please enter your student registration number.");
      return;
    }
    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith("@mnnit.ac.in")) {
      setRegError("Only official MNNIT email addresses (@mnnit.ac.in) are allowed to register.");
      return;
    }
    if (!regPassword || regPassword.length < 8) {
      setRegError("Password must be at least 8 characters long.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsRegistering(true);
    const res = await registerStudent({
      name: regName.trim(),
      regNo: regNo.trim(),
      email: cleanEmail,
      dietaryPref: regDiet,
      password: regPassword,
    });
    setIsRegistering(false);

    if (res.success) {
      setRegSuccess(`Registration enrolled! You can now sign in using ${cleanEmail}`);
      setRegName("");
      setRegNo("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
      setTimeout(() => setActiveTab("SIGN_IN"), 2000);
    } else {
      setRegError(res.error || "Registration enrollment failed.");
    }
  };

  return (
    <div className={`${THEME.card} p-5 sm:p-6 space-y-4 shadow-xs`}>
      {/* Tabs */}
      <div className="flex border-b border-[#E5E1D8] pb-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("SIGN_IN");
            setLoginError(null);
          }}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "SIGN_IN"
              ? "bg-[#244C3B] text-white shadow-xs"
              : "bg-[#FAF7F0] text-[#777064] hover:text-[#252820]"
          }`}
        >
          <LogIn className="w-4 h-4" /> Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("REGISTER");
            setRegError(null);
            setRegSuccess(null);
          }}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "REGISTER"
              ? "bg-[#244C3B] text-white shadow-xs"
              : "bg-[#FAF7F0] text-[#777064] hover:text-[#252820]"
          }`}
        >
          <UserPlus className="w-4 h-4" /> Register Student
        </button>
      </div>

      {/* SIGN IN TAB */}
      {activeTab === "SIGN_IN" && (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs sm:text-sm font-bold text-[#252820]">
              College Email Address
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. 20253137@mnnit.ac.in or warden@mnnit.ac.in"
              required
              className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] focus:ring-2 focus:ring-[#244C3B]/15 transition-all"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs sm:text-sm font-bold text-[#252820]">
              Password
            </label>
            <div className="relative">
              <input
                type={showLoginPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter your account password"
                required
                className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] focus:ring-2 focus:ring-[#244C3B]/15 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777064] hover:text-[#252820] cursor-pointer"
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-center gap-2 animate-scale-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn || !emailInput.trim() || !passwordInput}
            className="w-full py-2.5 sm:py-3 bg-[#244C3B] hover:bg-[#1B3A2D] text-white font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {isLoggingIn ? "Signing in..." : "Continue to Dashboard"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>
      )}

      {/* REGISTER TAB */}
      {activeTab === "REGISTER" && (
        <form onSubmit={handleStudentRegister} className="space-y-3.5 text-left">
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-bold text-[#252820]">Full Name</label>
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Aditya Verma"
              required
              className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] focus:ring-2 focus:ring-[#244C3B]/15 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-bold text-[#252820]">
              Student Registration No
            </label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder="e.g. 20251004"
              required
              className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] focus:ring-2 focus:ring-[#244C3B]/15 transition-all font-mono"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs sm:text-sm font-bold text-[#252820]">
                MNNIT Email Address
              </label>
              <span className="text-xs text-[#9E651E] font-mono font-bold">
                @mnnit.ac.in required
              </span>
            </div>
            <input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="e.g. 20251004@mnnit.ac.in"
              required
              className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] focus:ring-2 focus:ring-[#244C3B]/15 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-bold text-[#252820]">Password</label>
              <div className="relative">
                <input
                  type={showRegPassword ? "text" : "password"}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2 pr-9 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777064] hover:text-[#252820] cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-bold text-[#252820]">Confirm Password</label>
              <input
                type={showRegPassword ? "text" : "password"}
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-[#252820]">
              Dietary Preference
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["VEG", "NON_VEG", "JAIN"] as const).map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setRegDiet(pref)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all active:scale-[0.98] cursor-pointer ${
                    regDiet === pref
                      ? "bg-[#244C3B] text-white border-[#244C3B] shadow-2xs"
                      : "bg-[#FAF7F0] text-[#777064] border-[#E5E1D8] hover:text-[#252820] hover:bg-white"
                  }`}
                >
                  {pref === "NON_VEG" ? "NON-VEG" : pref}
                </button>
              ))}
            </div>
          </div>

          {regError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-center gap-2 animate-scale-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{regError}</span>
            </div>
          )}

          {regSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center gap-2 animate-scale-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{regSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full py-2.5 sm:py-3 bg-[#244C3B] hover:bg-[#1B3A2D] text-white font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isRegistering ? "Enrolling Student..." : "Register & Enter Dining Portal"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>
      )}
    </div>
  );
}
