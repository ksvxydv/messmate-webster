import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MessMate | College Hostel Mess & Dining Management",
  description:
    "Predictive hostel mess attendance, 30s rotating cryptographic QR passes, offline verification, and automated monthly rebate ledger for MNNIT Allahabad.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#F7F4EC] text-[#252820] min-h-screen selection:bg-[#244C3B] selection:text-white">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
