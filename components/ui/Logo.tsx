import React from "react";
import Image from "next/image";

interface LogoProps {
  variant?: "full" | "icon" | "stacked";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showSubtitle?: boolean;
}

export function LogoMark({
  className = "w-9 h-9",
  sizePx = 36,
}: {
  className?: string;
  sizePx?: number;
}) {
  return (
    <Image
      src="/brand-mark.png"
      alt="MessMate Brand Mark"
      width={sizePx}
      height={sizePx}
      priority
      unoptimized
      className={`object-contain shrink-0 ${className}`}
    />
  );
}

export default function Logo({
  variant = "full",
  size = "md",
  className = "",
  showSubtitle = true,
}: LogoProps) {
  const sizeMap = {
    xs: { mark: "w-6 h-6", text: "text-sm", sub: "text-[11px]", px: 24 },
    sm: { mark: "w-7 h-7", text: "text-sm sm:text-base", sub: "text-[11px]", px: 28 },
    md: { mark: "w-8 h-8 sm:w-9 sm:h-9", text: "text-base sm:text-lg", sub: "text-[11px] sm:text-xs", px: 36 },
    lg: { mark: "w-10 h-10", text: "text-lg sm:text-xl", sub: "text-xs", px: 40 },
    xl: { mark: "w-12 h-12", text: "text-xl sm:text-2xl", sub: "text-sm", px: 48 },
  };

  const currentSize = sizeMap[size];

  if (variant === "icon") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <LogoMark className={currentSize.mark} sizePx={currentSize.px} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <div className="shrink-0 transition-transform duration-200 group-hover:scale-105">
        <LogoMark className={currentSize.mark} sizePx={currentSize.px} />
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            className={`font-black tracking-tight text-[#252820] ${currentSize.text} leading-none`}
          >
            Mess<span className="text-[#244C3B]">Mate</span>
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9E651E] bg-[#D99A51]/15 rounded border border-[#D99A51]/30 leading-none">
            MNNIT
          </span>
        </div>
        {showSubtitle && (
          <span className={`text-[#777064] font-medium leading-tight ${currentSize.sub} mt-1 hidden sm:inline`}>
            Hostel Mess Management
          </span>
        )}
      </div>
    </div>
  );
}
