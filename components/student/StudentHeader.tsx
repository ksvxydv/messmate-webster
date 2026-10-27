"use client";

import React from "react";
import { User, Leaf, Drumstick, Wheat } from "lucide-react";
import { UserProfile, DietaryPref } from "@/types";

interface StudentHeaderProps {
  student: UserProfile | null;
  onDietaryChange: (pref: DietaryPref) => void;
}

export default function StudentHeader({
  student,
  onDietaryChange,
}: StudentHeaderProps) {
  if (!student) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Resident Identity Pill */}
      <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-[#E5E1D8] text-xs sm:text-sm shadow-xs">
        <User className="w-4 h-4 text-[#244C3B]" />
        <span className="font-bold text-[#252820]">{student.name}</span>
        <span className="text-[#777064] font-mono">({student.reg_no})</span>
      </div>

      {/* Dietary Preference Selector */}
      <div
        className="flex items-center bg-white p-1 rounded-xl border border-[#E5E1D8] text-xs shadow-xs"
        role="group"
        aria-label="Resident Dietary Preference"
      >
        {(["VEG", "NON_VEG", "JAIN"] as const).map((pref) => (
          <button
            key={pref}
            type="button"
            onClick={() => onDietaryChange(pref)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              student.dietary_pref === pref
                ? "bg-[#244C3B] text-white shadow-xs"
                : "text-[#777064] hover:text-[#252820]"
            }`}
          >
            {pref === "VEG" && (
              <>
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>Veg</span>
              </>
            )}
            {pref === "NON_VEG" && (
              <>
                <Drumstick className="w-3.5 h-3.5 text-rose-400" />
                <span>Non-Veg</span>
              </>
            )}
            {pref === "JAIN" && (
              <>
                <Wheat className="w-3.5 h-3.5 text-amber-400" />
                <span>Jain</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
