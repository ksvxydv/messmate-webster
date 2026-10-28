import Link from "next/link";
import { ShieldAlert, LogIn, ArrowLeft } from "lucide-react";
import { THEME } from "@/lib/theme";

interface RoleGuardProps {
  requiredRole: "STUDENT" | "STAFF" | "ADMIN";
  title?: string;
  description?: string;
}

export default function RoleGuard({
  requiredRole,
  title = "Restricted Access Portal",
  description,
}: RoleGuardProps) {
  const roleMeta = THEME.roles[requiredRole];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E1D8] p-8 rounded-3xl max-w-md text-center space-y-5 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-[#252820] tracking-tight">{title}</h2>
        <p className="text-xs sm:text-sm text-[#777064] leading-relaxed">
          {description || (
            <>
              This portal is restricted to authorized{" "}
              <span className="text-[#244C3B] font-bold">{roleMeta.label}</span>{" "}
              personnel. Please sign in with an authorized account to proceed.
            </>
          )}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto px-4 py-2.5 bg-[#244C3B] hover:bg-[#1B3A2D] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2.5 bg-[#FAF7F0] hover:bg-[#F0ECE1] text-[#252820] text-xs font-bold rounded-xl border border-[#E5E1D8] transition-all flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
