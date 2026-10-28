"use client";

import React from "react";
import {
  ScanLine,
  RefreshCw,
  Camera,
  CameraOff,
  RotateCcw,
  KeyRound,
} from "lucide-react";
import { THEME } from "@/lib/theme";

interface CameraScannerViewportProps {
  cameraState: "INITIALIZING" | "RUNNING" | "PERMISSION_DENIED" | "UNAVAILABLE" | "STOPPED";
  cameraError: string | null;
  onRetryCamera: () => void;
  showManualInput: boolean;
  onToggleManualInput: () => void;
  manualTokenInput: string;
  onManualTokenChange: (val: string) => void;
  onManualSubmit: (e: React.FormEvent) => void;
}

export default function CameraScannerViewport({
  cameraState,
  cameraError,
  onRetryCamera,
  showManualInput,
  onToggleManualInput,
  manualTokenInput,
  onManualTokenChange,
  onManualSubmit,
}: CameraScannerViewportProps) {
  return (
    <div className={`${THEME.card} p-5 overflow-hidden text-center space-y-3`}>
      <div className="rounded-2xl overflow-hidden bg-[#FAF7F0] border border-[#E5E1D8] relative min-h-[280px] flex flex-col items-center justify-center">
        {/* Live Video Element managed by Html5Qrcode */}
        <div
          id="reader"
          className={`w-full max-w-[320px] aspect-square mx-auto relative ${
            cameraState === "RUNNING" ? "block" : "hidden"
          }`}
        >
          {/* Viewfinder Target Corner Brackets */}
          <div className="absolute inset-4 pointer-events-none z-10">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#244C3B] rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#244C3B] rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#244C3B] rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#244C3B] rounded-br-lg" />
          </div>
        </div>

        {/* Scanning beam active during live video */}
        {cameraState === "RUNNING" && <div className="scanner-beam" />}

        {/* Starting / Initializing State */}
        {cameraState === "INITIALIZING" && (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#244C3B] mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-[#252820]">Initializing Camera Feed</h4>
              <p className="text-xs text-[#777064] mt-1">Requesting video permissions from browser...</p>
            </div>
          </div>
        )}

        {/* Permission Denied State */}
        {cameraState === "PERMISSION_DENIED" && (
          <div className="p-6 text-center space-y-3 max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mx-auto border border-rose-300">
              <CameraOff className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#252820]">Camera Permission Denied</h4>
              <p className="text-xs text-[#777064] mt-1">
                {cameraError || "Please allow camera access in your browser address bar to scan passes."}
              </p>
            </div>
            <button
              type="button"
              onClick={onRetryCamera}
              className="px-4 py-2 bg-[#244C3B] hover:bg-[#1B3A2D] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 mx-auto cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry Camera Access
            </button>
          </div>
        )}

        {/* Camera Unavailable / Hardware Not Found State */}
        {cameraState === "UNAVAILABLE" && (
          <div className="p-6 text-center space-y-3 max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto border border-amber-300">
              <Camera className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#252820]">No Camera Detected</h4>
              <p className="text-xs text-[#777064] mt-1">
                {cameraError || "Camera is unavailable in this environment. You can test scans using manual token input below."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onRetryCamera}
                className="px-3.5 py-1.5 bg-[#FAF7F0] hover:bg-[#F0ECE1] text-[#252820] border border-[#E5E1D8] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#244C3B]" /> Retry
              </button>
              <button
                type="button"
                onClick={onToggleManualInput}
                className="px-3.5 py-1.5 bg-[#244C3B] hover:bg-[#1B3A2D] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" /> Manual Token Input
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#777064] px-1">
        <span className="flex items-center gap-1.5 font-medium">
          <ScanLine className="w-3.5 h-3.5 text-[#244C3B]" />
          Align student&apos;s meal QR pass within camera view.
        </span>
        <button
          type="button"
          onClick={onToggleManualInput}
          className="text-[#244C3B] font-bold hover:underline cursor-pointer"
        >
          {showManualInput ? "Hide Code Input" : "Manual Code Input"}
        </button>
      </div>

      {/* Emergency / Demo Manual Token Input */}
      {showManualInput && (
        <form
          onSubmit={onManualSubmit}
          className="pt-3 border-t border-[#E5E1D8] flex items-center gap-2 text-left"
        >
          <input
            type="text"
            value={manualTokenInput}
            onChange={(e) => onManualTokenChange(e.target.value)}
            placeholder='Paste raw QR token string {"userId":...}'
            className="w-full bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3 py-2 text-xs font-mono text-[#252820] placeholder-[#777064] focus:outline-none focus:border-[#244C3B]"
          />
          <button
            type="submit"
            disabled={!manualTokenInput.trim()}
            className="px-4 py-2 bg-[#244C3B] hover:bg-[#1B3A2D] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
          >
            Verify
          </button>
        </form>
      )}
    </div>
  );
}
