"use client";

import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";

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
  if (!meal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 bg-pink-50 text-pink-600 font-bold text-xs rounded-full uppercase tracking-wide">
          {meal.meal_type} Cryptographic Pass
        </span>
        <h3 className="text-lg font-bold text-gray-800 mt-2">
          {student?.name}
        </h3>
        <p className="text-xs text-gray-500">
          Reg: {student?.reg_no} | Dietary: {student?.dietary_pref}
        </p>

        <div className="bg-gray-50 p-6 rounded-2xl my-5 flex justify-center border border-gray-100">
          {qrTokenString ? (
            <QRCodeSVG value={qrTokenString} size={200} />
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-xs">
              Generating HMAC Pass...
            </div>
          )}
        </div>

        <div className="text-xs font-semibold text-pink-600 mb-2">
          Token rotates in: {qrCountdown}s
        </div>

        <p className="text-[11px] text-amber-700 bg-amber-50 py-2 px-3 rounded-xl border border-amber-100 font-medium">
          ⚡ HMAC-SHA256 Signed. Screenshots expire automatically!
        </p>
      </div>
    </div>
  );
}
