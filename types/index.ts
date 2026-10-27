// Canonical Domain & Data Types for MessMate

export type UserRole = "STUDENT" | "STAFF" | "ADMIN";

export type DietaryPref = "VEG" | "NON_VEG" | "JAIN";

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER";

export type BookingStatus =
  | "OPTED_IN"
  | "OPTED_OUT"
  | "LOCKED"
  | "CONSUMED"
  | "MISSED";

export interface UserProfile {
  id: string;
  reg_no: string;
  name: string;
  email: string;
  role: UserRole;
  dietary_pref: DietaryPref;
}

export interface MealSlot {
  id: string;
  meal_date: string;
  meal_type: MealType;
  cutoff_time: string;
  menu_items: string;
  unit_cost: number;
  dietary_variants?: {
    VEG: string[];
    NON_VEG: string[];
    JAIN: string[];
  };
  created_at?: string;
}

export interface MealBooking {
  id: string;
  user_id: string;
  meal_slot_id: string;
  status: BookingStatus;
  scanned_at: string | null;
  scanned_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudentMealView extends MealSlot {
  bookingStatus: BookingStatus;
  bookingId: string | null;
  scannedAt: string | null;
}

export interface OfflineScanRecord {
  id?: number;
  userId: string;
  mealSlotId: string;
  qrToken: string;
  timestamp: string;
  synced?: boolean;
}

export interface RebateCalculationResult {
  totalRebateCredit: number;
  netPayable: number;
  optedOutCount: number;
}
