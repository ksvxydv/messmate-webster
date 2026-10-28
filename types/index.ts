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
  created_at?: string;
}

export interface RegisterPayload {
  name: string;
  regNo: string;
  email: string;
  dietaryPref: DietaryPref;
}

export interface SessionPayload {
  userId: string;
  role: UserRole;
  email: string;
  name?: string;
  exp: number;
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
  meal_bookings?: MealBooking[];
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
  users?: Pick<UserProfile, "name" | "reg_no" | "dietary_pref">;
  meal_slots?: Pick<MealSlot, "meal_type" | "menu_items" | "unit_cost" | "meal_date">;
}

export interface StudentMealView extends MealSlot {
  bookingStatus: BookingStatus;
  bookingId: string | null;
  scannedAt: string | null;
}

export interface OfflineScanRecord {
  id?: number;
  queueId: string;
  userId: string;
  mealSlotId: string;
  qrToken?: string;
  timestamp: string;
  synced: boolean;
  createdAt: string;
}

export interface QRTokenPayload {
  userId: string;
  mealSlotId: string;
  timeWindow: number;
  signature: string;
}

export interface VerifyTokenResult {
  valid: boolean;
  reason?: string;
  payload?: {
    userId: string;
    mealSlotId: string;
    timeWindow: number;
  };
}

export interface SyncDetailItem {
  queueId: string | number;
  userId?: string;
  mealSlotId?: string;
  status: "ACCEPTED" | "ALREADY_PROCESSED" | "CONFLICT" | "REJECTED" | "ERROR";
  reason?: string;
  bookingId?: string;
  currentStatus?: string;
}

export interface SyncResultSummary {
  total: number;
  synced: number;
  conflicts: number;
  failed: number;
  details: SyncDetailItem[];
}

export interface RebateCalculationResult {
  totalRebateCredit: number;
  netPayable: number;
  optedOutCount: number;
}

export interface RebateLedgerItem {
  bookingId: string;
  mealType: string;
  mealDate: string;
  creditAmount: number;
  recordedAt: string;
}

export interface MealWindowTheme {
  accentColor: string;
  badgeBg: string;
  borderGlow: string;
  headerGradient: string;
  iconColor: string;
  tagStyle: string;
}

export interface MealWindowConfig {
  mealType: MealType;
  cutoffHour: number;
  cutoffMinute: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  timingLabel: string;
  cutoffLabel: string;
  theme: MealWindowTheme;
}

export interface MealStatusDetails {
  timingLabel: string;
  cutoffLabel: string;
  isCutoffPassed: boolean;
  isServingNow: boolean;
  isBeforeServing: boolean;
  isAfterServing: boolean;
  statusBadgeText: string;
  statusBadgeColor: "emerald" | "blue" | "amber" | "slate" | "rose";
  theme: MealWindowTheme;
}
