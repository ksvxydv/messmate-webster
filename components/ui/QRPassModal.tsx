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
      className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl text-center relative border border-[#E5E1D8] modal-content overflow-hidden">
        {/* Top Ticket Header Strip */}
        <div className="bg-[#244C3B] p-5 text-white relative text-left">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close Dining Pass Modal"
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D99A51]"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-white/15 text-white font-bold text-[10px] rounded-full uppercase tracking-wider border border-white/20 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#D99A51]" />
              Official Entry Pass
            </span>
            <span className="text-white/60 text-xs font-mono">MNNIT Dining</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <h3 id="qr-modal-title" className="text-lg font-black tracking-tight text-white">
              {student?.name}
            </h3>
            <span className="text-xs font-mono font-bold text-[#D99A51]">
              {meal.meal_type}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-white/70 mt-1">
            <span>Reg: <strong className="text-white font-mono">{student?.reg_no}</strong></span>
            <span>Diet: <strong className="text-white">{student?.dietary_pref}</strong></span>
          </div>
        </div>

        {/* Ticket Perforation / Notch Divider */}
        <div className="relative flex items-center justify-between px-2 bg-[#FAF7F0] py-2 border-y border-dashed border-[#E5E1D8]">
          <div className="w-4 h-4 rounded-full bg-black/60 -ml-4" />
          <div className="flex-1 border-t border-dashed border-[#777064]/30 mx-2" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#777064] font-bold">
            Scan at Counter
          </span>
          <div className="flex-1 border-t border-dashed border-[#777064]/30 mx-2" />
          <div className="w-4 h-4 rounded-full bg-black/60 -mr-4" />
        </div>

        {/* QR Code Presentation Box */}
        <div className="p-6 bg-white space-y-4">
          <div className="bg-white p-4.5 rounded-2xl shadow-sm border-2 border-[#244C3B]/15 mx-auto max-w-[210px] relative">
            {qrTokenString ? (
              <div className="relative">
                <QRCodeSVG
                  value={qrTokenString}
                  size={170}
                  level="M"
                  fgColor="#244C3B"
                  bgColor="#ffffff"
                />
              </div>
            ) : (
              <div className="w-[170px] h-[170px] flex flex-col items-center justify-center text-[#777064] text-xs gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#244C3B]" />
                <span className="font-medium">Generating Pass...</span>
              </div>
            )}
          </div>

          {/* 30-Second Rotation Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#777064]">
              <span className="flex items-center gap-1 font-semibold text-[#252820]">
                <Clock3 className="w-3.5 h-3.5 text-[#D99A51] stroke-[2.2]" /> Rotating Signature
              </span>
              <span className="font-mono font-bold text-[#D99A51] bg-[#D99A51]/10 px-2 py-0.5 rounded-md">
                {qrCountdown}s
              </span>
            </div>
            <div className="w-full bg-[#FAF7F0] h-2 rounded-full overflow-hidden border border-[#E5E1D8]">
              <div
                className="bg-gradient-to-r from-[#244C3B] to-[#D99A51] h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${100 - countdownPercent}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-[#777064] bg-[#FAF7F0] p-2.5 rounded-xl border border-[#E5E1D8] text-center leading-relaxed">
            <span className="text-[#244C3B] font-bold">HMAC-SHA256 Protected:</span> Token expires automatically on window bucket change to prevent screenshot replay.
          </div>
        </div>
      </div>
    </div>
  );
}
