"use client";

import React from "react";
import { Users } from "lucide-react";
import { THEME } from "@/lib/theme";
import { UserProfile } from "@/types";

interface StudentPersonaSwitcherProps {
  studentProfiles: UserProfile[];
  activeStudentId?: string;
  onSelectStudent: (student: UserProfile) => void;
}

export default function StudentPersonaSwitcher({
  studentProfiles,
  activeStudentId,
  onSelectStudent,
}: StudentPersonaSwitcherProps) {
  if (studentProfiles.length <= 1) return null;

  return (
    <div
      className={`${THEME.card} p-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm`}
    >
      <div className="flex items-center gap-2 text-[#777064] font-bold">
        <Users className="w-4 h-4 text-[#D99A51]" />
        <span>Switch Student Persona (Demo):</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {studentProfiles.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectStudent(s)}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              activeStudentId === s.id
                ? "bg-[#244C3B] text-white shadow-xs"
                : "bg-[#FAF7F0] text-[#252820] hover:bg-[#F0ECE1] border border-[#E5E1D8]"
            }`}
          >
            {s.name} ({s.reg_no})
          </button>
        ))}
      </div>
    </div>
  );
}
