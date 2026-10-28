"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { THEME } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import Logo from "@/components/ui/Logo";
import {
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import { DietaryPref } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const { registerStudent } = useAuth();

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
      setRegError("Only official MNNIT email addresses (@mnnit.ac.in) are permitted to register.");
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
      regNo: regNo.trim().toUpperCase(),
      email: cleanEmail,
      dietaryPref: regDiet,
      password: regPassword,
    });
    setIsRegistering(false);

    if (res.success) {
      setRegSuccess(`Registration successful! Redirecting to student dining portal...`);
      setTimeout(() => {
        router.push("/student");
      }, 1200);
    } else {
      setRegError(res.error || "Registration failed. Please verify your details.");
    }
  };

  return (
    <AppShell
      badge="Student Enrollment"
      title="Hostel Mess Resident Registration"
      description="Create your student dining account with your verified MNNIT college credentials"
    >
      <div className="max-w-lg mx-auto py-6">
        <div className={`${THEME.card} p-7 space-y-6 shadow-sm`}>
          <div className="text-center flex flex-col items-center justify-center space-y-2">
            <Logo variant="full" size="lg" />
            <p className="text-xs text-[#777064]">
              MNNIT Allahabad Hostel Dining Registration
            </p>
          </div>

          <form onSubmit={handleStudentRegister} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-bold text-[#252820]">Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Aditya Verma"
                required
                className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#252820]">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. 20251004"
                  required
                  className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#252820]">
                  MNNIT Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. 20251004@mnnit.ac.in"
                  required
                  className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-[#252820]">Password</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 pr-9 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-all"
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
                  className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B] transition-all"
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
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{regSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-2.5 sm:py-3 bg-[#244C3B] hover:bg-[#1B3A2D] text-white font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {isRegistering ? "Registering Resident..." : "Complete Registration"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          <div className="pt-3 border-t border-[#E5E1D8] space-y-2 text-center text-xs text-[#777064]">
            <div>
              Already have an account?{" "}
              <Link href="/login" className="text-[#244C3B] font-bold hover:underline">
                Sign in here
              </Link>
            </div>
            <p className="text-[11px] text-[#777064]/80 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#244C3B]" />
              Staff and Warden accounts cannot be registered publicly.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
