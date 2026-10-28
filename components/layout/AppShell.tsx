import { ReactNode } from "react";
import { THEME } from "@/lib/theme";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  badge?: string;
  description?: string;
  actions?: ReactNode;
}

export default function AppShell({
  children,
  title,
  badge,
  description,
  actions,
}: AppShellProps) {
  return (
    <div className={THEME.pageBg}>
      <div className={`${THEME.container} animate-fade-in-up`}>
        {(title || badge || actions) && (
          <header className={`${THEME.card} ${THEME.cardHeader} flex-col sm:flex-row items-start sm:items-center`}>
            <div>
              {badge && (
                <span className="px-2.5 py-0.5 bg-[#244C3B]/10 text-[#244C3B] font-bold text-xs rounded-md border border-[#244C3B]/20 inline-block mb-1.5 uppercase tracking-wide">
                  {badge}
                </span>
              )}
              {title && (
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#252820] tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-[#777064] mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
          </header>
        )}
        {children}

        {/* Refined Institutional Footer */}
        <footer className="pt-8 pb-12 mt-12 border-t border-[#E5E1D8]/80 text-xs text-[#777064] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-[#252820]">MessMate Operational System</span>
              <span className="text-[#E5E1D8]">|</span>
              <span>Webster 2026 • CodeSangam</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span>MNNIT Allahabad</span>
              <span>•</span>
              <span>HMAC-SHA256 QR Passes</span>
              <span>•</span>
              <span>Atomic CAS Ledger</span>
            </div>
          </div>
          <div className="text-center sm:text-left text-[11px] text-[#777064]/80 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p>Predictive Hostel Mess Resource Management &amp; Cryptographic Attendance Verification.</p>
            <p className="font-mono">Track: E2 — The Kamar-Taj Refectory</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
