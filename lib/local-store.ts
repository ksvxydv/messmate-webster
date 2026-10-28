// Server-Authoritative Local Data Store & Repository for MessMate
// Provides a resilient, zero-dependency in-memory & file-backed database layer
// Automatically keeps student registrations, bookings, and menus alive even if Supabase is offline.

import fs from "fs";
import path from "path";
import type { UserProfile, MealType, DietaryPref } from "../types/index.ts";
import { WEEKLY_DIETARY_MENUS } from "./menus.ts";
import { getTodayDateString, getISTDayOfWeek, SLOT_CONFIGS } from "./seed-service.ts";

export interface StoredMealSlot {
  id: string;
  meal_date: string;
  meal_type: MealType;
  cutoff_time: string;
  unit_cost: number;
  menu_items: string;
  dietary_variants: {
    VEG: string[];
    NON_VEG: string[];
    JAIN: string[];
  };
}

export interface StoredBooking {
  id: string;
  user_id: string;
  meal_slot_id: string;
  status: "OPTED_IN" | "OPTED_OUT" | "LOCKED" | "CONSUMED" | "MISSED";
  scanned_at?: string | null;
  scanned_by?: string | null;
  updated_at: string;
}

export interface LocalDatabaseSchema {
  users: UserProfile[];
  slots: Record<string, StoredMealSlot[]>; // date -> slots
  bookings: StoredBooking[];
}

const DEFAULT_USERS: UserProfile[] = [
  {
    id: "783e35dd-de18-42b2-ab6a-8fb3218adeed",
    reg_no: "20251001",
    name: "Aarav Sharma",
    email: "aarav@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "VEG",
  },
  {
    id: "26e80213-53ec-4db4-891d-a8468634188b",
    reg_no: "20251002",
    name: "Rohan Verma",
    email: "rohan@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "NON_VEG",
  },
  {
    id: "63e250d8-70ec-4f44-aad5-e33dd5680d4b",
    reg_no: "20253137",
    name: "Keshav",
    email: "20253137@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "VEG",
  },
  {
    id: "b680b99e-4078-47ef-a743-39568ff7f3e5",
    reg_no: "20251423",
    name: "Piyush",
    email: "piyush@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "JAIN",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227c",
    reg_no: "STAFF01",
    name: "Ramesh Kumar (Mess Guard)",
    email: "staff@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
  },
  {
    id: "1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809",
    reg_no: "ADMIN01",
    name: "Chief Warden / Mess Manager",
    email: "admin@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
  },
];

class LocalStoreManager {
  private data: LocalDatabaseSchema;
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), ".messmate-data.json");
    this.data = this.loadInitialData();
  }

  private loadInitialData(): LocalDatabaseSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // Fallback silently to memory
    }

    return {
      users: [...DEFAULT_USERS],
      slots: {},
      bookings: [],
    };
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      // Memory persistence is sufficient if filesystem write fails
    }
  }

  // --- Users Operations ---
  public getUsers(): UserProfile[] {
    return [...this.data.users];
  }

  public findUserById(id: string): UserProfile | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByEmailOrRegNo(email: string, regNo?: string): UserProfile | undefined {
    const cleanEmail = email.trim().toLowerCase();
    const cleanReg = regNo?.trim().toUpperCase();
    return this.data.users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        (cleanReg && u.reg_no.toUpperCase() === cleanReg)
    );
  }

  public registerUser(profile: {
    name: string;
    regNo: string;
    email: string;
    dietaryPref?: DietaryPref;
    role?: "STUDENT" | "STAFF" | "ADMIN";
  }): UserProfile {
    const existing = this.findUserByEmailOrRegNo(profile.email, profile.regNo);
    if (existing) {
      return existing;
    }

    const newUser: UserProfile = {
      id: "usr-" + Math.random().toString(36).substring(2, 11),
      name: profile.name.trim(),
      reg_no: profile.regNo.trim().toUpperCase(),
      email: profile.email.trim().toLowerCase(),
      role: profile.role || "STUDENT",
      dietary_pref: profile.dietaryPref || "VEG",
    };

    this.data.users.push(newUser);

    // Auto-seed today's slots and bookings for this new student
    const today = getTodayDateString(new Date());
    const slots = this.ensureSlots(today, new Date());
    slots.forEach((s) => {
      this.upsertBooking({
        id: `bk-${newUser.id}-${s.id}`,
        user_id: newUser.id,
        meal_slot_id: s.id,
        status: "OPTED_IN",
        updated_at: new Date().toISOString(),
      });
    });

    this.persist();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    this.persist();
    return user;
  }

  // --- Slots Operations ---
  public ensureSlots(dateStr: string, referenceDate: Date = new Date()): StoredMealSlot[] {
    if (this.data.slots[dateStr] && this.data.slots[dateStr].length > 0) {
      return this.data.slots[dateStr];
    }

    const dow = getISTDayOfWeek(referenceDate);
    const daySchedule = WEEKLY_DIETARY_MENUS[dow] || WEEKLY_DIETARY_MENUS[1];

    const slots: StoredMealSlot[] = SLOT_CONFIGS.map(({ meal_type, hour, minute, unit_cost }) => {
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      const cutoff = new Date(`${dateStr}T${hh}:${mm}:00+05:30`);
      const menuForMeal = daySchedule[meal_type as MealType] || daySchedule.BREAKFAST;

      return {
        id: `slot-${meal_type.toLowerCase()}-${dateStr}`,
        meal_date: dateStr,
        meal_type: meal_type as MealType,
        cutoff_time: cutoff.toISOString(),
        unit_cost,
        menu_items: JSON.stringify(menuForMeal),
        dietary_variants: menuForMeal,
      };
    });

    this.data.slots[dateStr] = slots;

    // Ensure default bookings for all existing students
    const students = this.data.users.filter((u) => u.role === "STUDENT");
    slots.forEach((slot) => {
      students.forEach((student) => {
        const existingBooking = this.data.bookings.find(
          (b) => b.user_id === student.id && b.meal_slot_id === slot.id
        );
        if (!existingBooking) {
          this.data.bookings.push({
            id: `bk-${student.id}-${slot.id}`,
            user_id: student.id,
            meal_slot_id: slot.id,
            status: "OPTED_IN",
            updated_at: referenceDate.toISOString(),
          });
        }
      });
    });

    this.persist();
    return slots;
  }

  // --- Bookings Operations ---
  public getBookings(userId?: string, slotId?: string): StoredBooking[] {
    let result = this.data.bookings;
    if (userId) {
      result = result.filter((b) => b.user_id === userId);
    }
    if (slotId) {
      result = result.filter((b) => b.meal_slot_id === slotId);
    }
    return [...result];
  }

  public upsertBooking(booking: StoredBooking): StoredBooking {
    const idx = this.data.bookings.findIndex(
      (b) => b.user_id === booking.user_id && b.meal_slot_id === booking.meal_slot_id
    );

    if (idx >= 0) {
      this.data.bookings[idx] = { ...this.data.bookings[idx], ...booking };
      this.persist();
      return this.data.bookings[idx];
    }

    this.data.bookings.push(booking);
    this.persist();
    return booking;
  }

  public atomicConsume(
    userId: string,
    slotId: string,
    staffId: string
  ): { success: boolean; error?: string; booking?: StoredBooking } {
    const booking = this.data.bookings.find(
      (b) => b.user_id === userId && b.meal_slot_id === slotId
    );

    if (!booking) {
      return { success: false, error: "No booking record found for this meal." };
    }

    if (booking.status === "CONSUMED") {
      return {
        success: false,
        error: `Double Scan Detected: Meal already consumed at ${booking.scanned_at || "earlier"}.`,
      };
    }

    if (booking.status === "OPTED_OUT") {
      return {
        success: false,
        error: "Meal was opted out. Student is not eligible to dine.",
      };
    }

    booking.status = "CONSUMED";
    booking.scanned_at = new Date().toISOString();
    booking.scanned_by = staffId;
    booking.updated_at = new Date().toISOString();

    this.persist();
    return { success: true, booking };
  }
}

// Global Singleton for application runtime
const globalForStore = global as unknown as { localStore: LocalStoreManager };
export const localStore = globalForStore.localStore || new LocalStoreManager();
if (process.env.NODE_ENV !== "production") globalForStore.localStore = localStore;
