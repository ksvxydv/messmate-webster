import Link from "next/link";
import { ShieldAlert } from "lucide-react";
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
      <div className="bg-white border border-[#E5E1D8] p-8 rounded-3xl max-w-md text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-[#252820] tracking-tight">{title}</h2>
        <p className="text-xs text-[#777064] leading-relaxed">
          {description || (
            <>
              This portal is restricted to authorized{" "}
              <span className="text-[#244C3B] font-bold">{roleMeta.label} ({requiredRole})</span>{" "}
              personnel. Please switch your active role in the navigation bar to proceed.
            </>
          )}
        </p>
        <Link href="/" className={`${THEME.btnSecondary} mx-auto inline-flex`}>
          Return to Overview
        </Link>
      </div>
    </div>
  );
}
