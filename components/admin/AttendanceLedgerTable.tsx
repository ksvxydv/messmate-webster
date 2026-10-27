"use client";

import React from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { THEME } from "@/lib/theme";

interface AttendanceLedgerTableProps {
  bookings: any[];
  users: any[];
  slots: any[];
}

export default function AttendanceLedgerTable({
  bookings,
  users,
  slots,
}: AttendanceLedgerTableProps) {
  return (
    <div className={`${THEME.card} p-6 sm:p-7 space-y-4`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
        <div>
          <h3 className="text-base font-black text-[#252820]">Live Audit &amp; Attendance Ledger</h3>
          <p className="text-xs text-[#777064] mt-0.5">
            Verified dining hall counter check-ins and attendance records
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF7F0] border border-[#E5E1D8] text-[#777064]">
          {bookings.length} Active Resident Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#E5E1D8] text-[#777064] uppercase text-xs bg-[#FAF7F0]">
              <th className="py-3 px-3.5 rounded-l-lg font-bold">Student</th>
              <th className="py-3 px-3.5 font-bold">Reg No</th>
              <th className="py-3 px-3.5 font-bold">Dietary</th>
              <th className="py-3 px-3.5 font-bold">Meal Slot</th>
              <th className="py-3 px-3.5 font-bold">Status</th>
              <th className="py-3 px-3.5 rounded-r-lg font-bold">Scanned Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E1D8]/60">
            {bookings.map((b) => {
              const student = users.find((u) => u.id === b.user_id);
              const slot = slots.find((s) => s.id === b.meal_slot_id);
              return (
                <tr key={b.id} className="hover:bg-[#FAF7F0] transition-colors">
                  <td className="py-3 px-3.5 font-bold text-[#252820]">
                    {student?.name || "Student"}
                  </td>
                  <td className="py-3 px-3.5 text-[#777064] font-mono">
                    {student?.reg_no || "-"}
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="px-2.5 py-0.5 bg-white border border-[#E5E1D8] text-[#252820] rounded-md text-xs font-bold">
                      {student?.dietary_pref || "VEG"}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 font-bold text-[#252820]">
                    {slot?.meal_type || "-"}
                  </td>
                  <td className="py-3 px-3.5">
                    <StatusBadge status={b.status} size="sm" />
                  </td>
                  <td className="py-3 px-3.5 text-xs text-[#777064] font-mono">
                    {b.scanned_at ? new Date(b.scanned_at).toLocaleTimeString() : "Not scanned"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
