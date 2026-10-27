// Central Theme Tokens & Style Guide for MessMate
// Official Master Palette: Deep Green (#244C3B), Warm Ivory (#F7F4EC), Saffron (#D99A51), White (#FFFFFF), Main Text (#252820), Secondary Text (#777064), Borders (#E5E1D8)

export const THEME = {
  // Page backgrounds & surfaces
  pageBg: "min-h-screen bg-[#F7F4EC] text-[#252820] antialiased",
  container: "max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6",

  // Card styles: Crisp white surfaces on warm ivory backdrop with subtle stone borders
  card: "bg-white rounded-2xl border border-[#E5E1D8] shadow-sm shadow-[#244C3B]/5 hover:border-[#D99A51]/50 transition-all duration-200",
  cardHeader: "p-5 sm:p-6 border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3",
  cardBody: "p-5 sm:p-6",
  subCard: "bg-[#FAF7F0] rounded-xl border border-[#E5E1D8] p-4 hover:border-[#D99A51]/40 transition-colors",

  // Button styles: Deep green primary, warm ivory secondary, saffron accent
  btnPrimary: "px-4 py-2.5 bg-[#244C3B] hover:bg-[#1B3A2D] active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
  btnSecondary: "px-4 py-2.5 bg-white hover:bg-[#FAF7F0] active:scale-[0.98] text-[#252820] font-bold text-xs sm:text-sm rounded-xl border border-[#E5E1D8] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50",
  btnDanger: "px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs sm:text-sm rounded-xl border border-rose-200 active:scale-[0.98] transition-all cursor-pointer",
  btnSuccess: "px-4 py-2.5 bg-[#244C3B] hover:bg-[#1B3A2D] active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50",
  btnSaffron: "px-4 py-2.5 bg-[#D99A51] hover:bg-[#C5863D] active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer",

  // Role theme colors
  roles: {
    STUDENT: {
      label: "Hostel Resident",
      badge: "bg-[#244C3B]/10 text-[#244C3B] border-[#244C3B]/20",
      accent: "text-[#244C3B]",
    },
    STAFF: {
      label: "Dining Staff",
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
      accent: "text-emerald-700",
    },
    ADMIN: {
      label: "Mess Warden",
      badge: "bg-[#D99A51]/15 text-[#9E651E] border-[#D99A51]/30",
      accent: "text-[#D99A51]",
    },
  },
} as const;
