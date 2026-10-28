import type { UserProfile } from "../types/index.ts";

export const INSTITUTIONAL_TIMEZONE = "Asia/Kolkata";
export const COLLEGE_DOMAIN = "mnnit.ac.in";
export const MNNIT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@mnnit\.ac\.in$/i;

export const DEFAULT_BASE_MONTHLY_FEE = 4500;
export const DEFAULT_MEAL_UNIT_COST = 50;

export const QR_WINDOW_MS = 30_000;
export const MAX_OFFLINE_SYNC_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const BRAND_COLORS = {
  forestGreen: "#244C3B",
  warmIvory: "#F7F4EC",
  saffron: "#D99A51",
  stone: "#E5E1D8",
} as const;

export const DEMO_USERS: UserProfile[] = [
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d471",
    reg_no: "20251001",
    name: "Aarav Sharma",
    email: "20251001@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "VEG",
  },
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d472",
    reg_no: "20251002",
    name: "Rohan Verma",
    email: "20251002@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "NON_VEG",
  },
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    reg_no: "20253137",
    name: "Keshav",
    email: "20253137@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "VEG",
  },
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d473",
    reg_no: "20251423",
    name: "Piyush",
    email: "20251423@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "JAIN",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227c",
    reg_no: "STAFF-01",
    name: "Ramesh Kumar (Mess Staff)",
    email: "staff@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
  },
  {
    id: "1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809",
    reg_no: "ADMIN-01",
    name: "Chief Warden / Mess Manager",
    email: "warden@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
  },
];
