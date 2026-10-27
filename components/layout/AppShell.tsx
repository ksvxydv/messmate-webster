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
      </div>
    </div>
  );
}
