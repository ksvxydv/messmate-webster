"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock3, ChevronDown, RotateCcw, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function DevTimeController() {
  const { getAuthHeaders } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentTimeText, setCurrentTimeText] = useState<string>("--:--:--");
  const [isSimulated, setIsSimulated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const fetchClockState = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/time");
      const data = await res.json();
      const serverDate = new Date(data.serverTime);
      setCurrentTimeText(
        serverDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      );
      setIsSimulated(data.isSimulated);
    } catch {}
  }, []);

  useEffect(() => {
    fetchClockState();
    const timer = setInterval(fetchClockState, 2000);
    return () => clearInterval(timer);
  }, [fetchClockState]);

  const handleApplyScenario = async (scenario: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/time", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveScenario(scenario);
        setIsSimulated(true);
        fetchClockState();
        window.dispatchEvent(new Event("messmate:time-changed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/time", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveScenario(null);
        setIsSimulated(false);
        fetchClockState();
        window.dispatchEvent(new Event("messmate:time-changed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTime) return;
    setLoading(true);
    try {
      const iso = new Date(customTime).toISOString();
      const res = await fetch("/api/dev/time", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ targetTime: iso }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSimulated(true);
        setActiveScenario("CUSTOM");
        fetchClockState();
        window.dispatchEvent(new Event("messmate:time-changed"));
        setIsOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const scenarios = [
    { id: "PRE_CUTOFF", label: "10:30 AM (Pre-Cutoff)", desc: "Opt-in / opt-out toggles are open. Rebates active." },
    { id: "LUNCH_RUSH", label: "01:15 PM (Lunch Rush & Dining)", desc: "Cutoff LOCKED: 30s rotating QR & dining hall check-in active." },
    { id: "DINNER_RUSH", label: "08:15 PM (Dinner Service)", desc: "Dinner check-in window open. Counter plate alerts active." },
    { id: "SURPLUS_ALERT", label: "09:45 PM (Surplus Dispatch)", desc: "Post-service unclaimed portions ready for NGO redistribution." },
  ];

  return (
    <div className="relative font-sans">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all border cursor-pointer ${
          isSimulated
            ? "bg-[#D99A51]/15 text-[#9E651E] border-[#D99A51]/50 shadow-xs"
            : "bg-white text-[#252820] border-[#E5E1D8] hover:bg-[#FAF7F0]"
        }`}
        title="Simulate server time for testing cutoff deadlines"
        aria-label="Server clock time travel controller"
        aria-expanded={isOpen}
      >
        <Clock3 className={`w-3.5 h-3.5 stroke-[2] ${isSimulated ? "text-[#D99A51]" : "text-[#777064]"}`} />
        <span>{currentTimeText}</span>
        {isSimulated && (
          <span className="text-[10px] bg-[#D99A51]/25 px-2 py-0.5 rounded-md font-sans uppercase font-black text-[#9E651E] flex items-center gap-1 border border-[#D99A51]/30">
            <Sparkles className="w-2.5 h-2.5" /> Demo Time
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-[#777064] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-white rounded-2xl border border-[#E5E1D8] shadow-xl p-4 z-50 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-2.5">
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-[#244C3B] stroke-[2]" />
              <div>
                <h4 className="font-bold text-[#252820] text-sm leading-tight">Server Time Travel</h4>
                <p className="text-[10px] text-[#777064]">Demonstration mode for live evaluation</p>
              </div>
            </div>
            {isSimulated && (
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-2 py-1 rounded-lg bg-[#FAF7F0] hover:bg-[#F0ECE1] text-[#777064] hover:text-[#252820] text-[10px] flex items-center gap-1 cursor-pointer font-bold border border-[#E5E1D8] transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset Live
              </button>
            )}
          </div>

          {isSimulated && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
              <span className="font-semibold">⚠️ Time Simulation is Active</span>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-300">
                Mocking Server Clock
              </span>
            </div>
          )}

          <p className="text-[11px] text-[#777064] leading-relaxed">
            Shift the simulated server clock to verify preparation cutoff locks, serving hour QR passes, and surplus food redistribution:
          </p>

          <div className="space-y-1.5">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleApplyScenario(sc.id)}
                disabled={loading}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeScenario === sc.id
                    ? "bg-[#244C3B]/10 border-[#244C3B] text-[#244C3B]"
                    : "bg-[#FAF7F0] border-[#E5E1D8] text-[#252820] hover:border-[#D99A51]/60"
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    {sc.label}
                    {activeScenario === sc.id && <Check className="w-3.5 h-3.5 text-[#244C3B] stroke-[2.5]" />}
                  </div>
                  <div className="text-[10px] text-[#777064] mt-0.5">{sc.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomTime} className="pt-2 border-t border-[#E5E1D8] flex items-center gap-2">
            <input
              type="datetime-local"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-2.5 py-1.5 text-[#252820] text-xs w-full focus:outline-none focus:border-[#244C3B]"
            />
            <button
              type="submit"
              disabled={loading || !customTime}
              className="px-3 py-1.5 bg-[#244C3B] hover:bg-[#1B3A2D] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
            >
              Set
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
