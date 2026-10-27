import React from "react";
import {
  CircleCheck,
  CircleMinus,
  LockKeyhole,
  BadgeCheck,
  CircleX,
  CircleHelp,
} from "lucide-react";

interface StatusBadgeProps {
  status: "OPTED_IN" | "OPTED_OUT" | "LOCKED" | "CONSUMED" | "MISSED" | string;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  string,
  { label: string; style: string; icon: React.ComponentType<{ className?: string }> }
> = {
  OPTED_IN: {
    label: "Attending",
    style: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
    icon: CircleCheck,
  },
  OPTED_OUT: {
    label: "Skipping (Rebated)",
    style: "bg-amber-50 text-amber-900 border-amber-300 font-bold",
    icon: CircleMinus,
  },
  LOCKED: {
    label: "Preparation Locked",
    style: "bg-[#244C3B]/10 text-[#244C3B] border-[#244C3B]/25 font-bold",
    icon: LockKeyhole,
  },
  CONSUMED: {
    label: "Redeemed (Eaten)",
    style: "bg-purple-50 text-purple-900 border-purple-200 font-bold",
    icon: BadgeCheck,
  },
  MISSED: {
    label: "Unclaimed (Missed)",
    style: "bg-rose-50 text-rose-800 border-rose-200 font-bold",
    icon: CircleX,
  },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    style: "bg-[#FAF7F0] text-[#777064] border-[#E5E1D8] font-medium",
    icon: CircleHelp,
  };
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs transition-colors ${
        cfg.style
      } ${size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3 stroke-[2]" : "w-3.5 h-3.5 stroke-[2]"} />
      {cfg.label}
    </span>
  );
}
