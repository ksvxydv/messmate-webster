"use client";

import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, ShieldCheck, Clock3, RefreshCw } from "lucide-react";

interface QRPassModalProps {
  meal: any;
  student: any;
  qrTokenString: string;
  qrCountdown: number;
  onClose: () => void;
}

export default function QRPassModal({
  meal,
  student,
  qrTokenString,
  qrCountdown,
  onClose,
}: QRPassModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: ESC key to close modal
  useEffect(() => {
    if (!meal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [meal, onClose]);

  if (!meal) return null;
  const countdownPercent = ((30 - qrCountdown) / 30) * 100;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center relative border border-[#E5E1D8] modal-content">
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close Dining Pass Modal"
          className="absolute top-4 right-4 text-[#777064] hover:text-[#252820] bg-[#FAF7F0] hover:bg-[#F0ECE1] p-2 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#244C3B]"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 bg-[#244C3B]/10 text-[#244C3B] font-bold text-xs rounded-full uppercase tracking-wider border border-[#244C3B]/20 inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
          {meal.meal_type} Dining Pass
        </span>

        <h3 id="qr-modal-title" className="text-xl font-black text-[#252820] mt-3">
          {student?.name}
        </h3>
        <p className="text-xs text-[#777064] mt-0.5">
          Reg: <span className="text-[#252820] font-mono font-bold">{student?.reg_no}</span> • Diet:{" "}
          <span className="text-[#244C3B] font-bold">{student?.dietary_pref}</span>
        </p>

        {/* High-contrast QR Container */}
        <div className="bg-white p-5 rounded-2xl my-5 flex justify-center shadow-md border border-[#E5E1D8] mx-auto max-w-[220px]">
          {qrTokenString ? (
            <QRCodeSVG value={qrTokenString} size={180} level="M" fgColor="#244C3B" bgColor="#ffffff" />
          ) : (
            <div className="w-[180px] h-[180px] flex flex-col items-center justify-center text-[#777064] text-xs gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#244C3B]" />
              <span>Generating Pass...</span>
            </div>
          )}
        </div>

        {/* 30-Second Rotation Progress */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs text-[#777064]">
            <span className="flex items-center gap-1 font-medium">
              <Clock3 className="w-3.5 h-3.5 text-[#D99A51] stroke-[2]" /> Rotating Pass Token
            </span>
            <span className="font-mono font-bold text-[#D99A51]">{qrCountdown}s</span>
          </div>
          <div className="w-full bg-[#FAF7F0] h-2 rounded-full overflow-hidden border border-[#E5E1D8]">
            <div
              className="bg-gradient-to-r from-[#244C3B] to-[#D99A51] h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${100 - countdownPercent}%` }}
            />
          </div>
        </div>

        <div className="text-[11px] text-[#252820] bg-[#FAF7F0] p-3 rounded-xl border border-[#E5E1D8] text-left leading-relaxed">
          <strong className="text-[#244C3B]">Single-use cryptographic pass:</strong> Automatically rotates every 30 seconds via HMAC-SHA256. Screenshots cannot be shared or double-scanned.
        </div>
      </div>
    </div>
  );
}
