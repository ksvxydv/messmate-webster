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

export const FIXED_ACCOUNT_MAP: Record<
  string,
  { email: string; role: "ADMIN" | "STAFF"; regNo: string; initialPassword: string }
> = {
  warden: {
    email: "warden@mnnit.ac.in",
    role: "ADMIN",
    regNo: "WARDEN01",
    initialPassword: "Warden#2026",
  },
  admin: {
    email: "warden@mnnit.ac.in",
    role: "ADMIN",
    regNo: "WARDEN01",
    initialPassword: "Warden#2026",
  },
  staff1: {
    email: "staff01@mnnit.ac.in",
    role: "STAFF",
    regNo: "STAFF01",
    initialPassword: "Staff1#2026",
  },
  staff2: {
    email: "staff02@mnnit.ac.in",
    role: "STAFF",
    regNo: "STAFF02",
    initialPassword: "Staff2#2026",
  },
  staff3: {
    email: "staff03@mnnit.ac.in",
    role: "STAFF",
    regNo: "STAFF03",
    initialPassword: "Staff3#2026",
  },
  staff4: {
    email: "staff04@mnnit.ac.in",
    role: "STAFF",
    regNo: "STAFF04",
    initialPassword: "Staff4#2026",
  },
  staff5: {
    email: "staff05@mnnit.ac.in",
    role: "STAFF",
    regNo: "STAFF05",
    initialPassword: "Staff5#2026",
  },
  staff: {
    email: "staff01@mnnit.ac.in",
    role: "STAFF",
    regNo: "STAFF01",
    initialPassword: "Staff1#2026",
  },
};

const DEFAULT_HASH = "ed5d71dc0a56a3ee293695093bd9a774dfc5f3a68874ac45f588a1a65aa3cacb";
const DEFAULT_SALT = "0123456789abcdef0123456789abcdef";

const DEFAULT_USERS: UserProfile[] = [
  // 1. One Fixed Chief Warden / Administrator Account (ID: warden / Password: Warden#2026)
  {
    id: "1a794de0-0b8e-4d8a-b8a3-0bc1c4b05809",
    reg_no: "WARDEN01",
    name: "Prof. R. K. Singh (Chief Warden)",
    email: "warden@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
    password_hash: "d9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82",
    password_salt: "d39bbdd07231194687df664fcb25bb67",
  },
  {
    id: "9a794de0-0b8e-4d8a-b8a3-0bc1c4b05800",
    reg_no: "ADMIN01",
    name: "Chief Warden / Mess Manager",
    email: "admin@mnnit.ac.in",
    role: "ADMIN",
    dietary_pref: "VEG",
    password_hash: "d9fd2f86542b8dee7bec9ea413c9a81d8afa0294b67d65053a30e92fc2692f82",
    password_salt: "d39bbdd07231194687df664fcb25bb67",
  },

  // 2. Exactly Five Fixed Staff Accounts (IDs: staff1..staff5 / Passwords: Staff1#2026..Staff5#2026)
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227c",
    reg_no: "STAFF01",
    name: "Staff 01 (Cashier Counter 1)",
    email: "staff01@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a",
    password_salt: "fa68e5315280edd08f22227bd8064c07",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227d",
    reg_no: "STAFF02",
    name: "Staff 02 (Cashier Counter 2)",
    email: "staff02@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "5090085b658d53e78d8809dc3259b5b2fb92f2cb3eed2737b41d5c86f45245fd",
    password_salt: "5916d7ed24c049e8c7c2628a5284ef7c",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227e",
    reg_no: "STAFF03",
    name: "Staff 03 (Cashier Counter 3)",
    email: "staff03@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "6eb17d5b51e028d9870623d29f6677995f0331c0d4c21cbcf75af9b777b5ce33",
    password_salt: "0357d0e3bf4f96c2ed26faa0be4654a5",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb227f",
    reg_no: "STAFF04",
    name: "Staff 04 (Dinner Gatekeeper)",
    email: "staff04@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "dbcba9773d54823c9d34d8add51daa7221eb58e5ac4d54f9ae885ff28ccda99b",
    password_salt: "a46676b13d24001e81a4ee419631180e",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb2280",
    reg_no: "STAFF05",
    name: "Staff 05 (Meal Check Scanner)",
    email: "staff05@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "5874ed5897b8aa687dd5f62b6d9dc788d3b82399d274b47f00f86d47d94e232a",
    password_salt: "753adb0c50f7e5fab86bfd75767dc39c",
  },
  {
    id: "8443a262-acc4-4d34-9ddd-757ddaeb2281",
    reg_no: "STAFF00",
    name: "Ramesh Kumar (Mess Staff)",
    email: "staff@mnnit.ac.in",
    role: "STAFF",
    dietary_pref: "VEG",
    password_hash: "23e29fe7459514ae83d0ed6c8fadb1084c2fca0a4c680bd3d0fdc2224b20bc3a",
    password_salt: "fa68e5315280edd08f22227bd8064c07",
  },

  // 3. Resident Student Accounts
  {
    id: "783e35dd-de18-42b2-ab6a-8fb3218adeed",
    reg_no: "20251001",
    name: "Aarav Sharma",
    email: "aarav@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "VEG",
    password_hash: DEFAULT_HASH,
    password_salt: DEFAULT_SALT,
  },
  {
    id: "26e80213-53ec-4db4-891d-a8468634188b",
    reg_no: "20251002",
    name: "Rohan Verma",
    email: "rohan@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "NON_VEG",
    password_hash: DEFAULT_HASH,
    password_salt: DEFAULT_SALT,
  },
  {
    id: "63e250d8-70ec-4f44-aad5-e33dd5680d4b",
    reg_no: "20253137",
    name: "Keshav",
    email: "20253137@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "VEG",
    password_hash: DEFAULT_HASH,
    password_salt: DEFAULT_SALT,
  },
  {
    id: "b680b99e-4078-47ef-a743-39568ff7f3e5",
    reg_no: "20251423",
    name: "Piyush",
    email: "piyush@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "JAIN",
    password_hash: DEFAULT_HASH,
    password_salt: DEFAULT_SALT,
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
          // Idempotently merge any missing or updated default accounts
          for (const defUser of DEFAULT_USERS) {
            const existingIndex = parsed.users.findIndex(
              (u: UserProfile) => u.email.toLowerCase() === defUser.email.toLowerCase()
            );
            if (existingIndex === -1) {
              parsed.users.push({ ...defUser });
            } else {
              // Keep authoritative attributes synced while preserving passwords if modified
              parsed.users[existingIndex].role = defUser.role;
              parsed.users[existingIndex].reg_no = defUser.reg_no;
              if (
                !parsed.users[existingIndex].password_hash ||
                parsed.users[existingIndex].password_hash === DEFAULT_HASH
              ) {
                parsed.users[existingIndex].password_hash = defUser.password_hash;
                parsed.users[existingIndex].password_salt = defUser.password_salt;
              }
            }
          }

          // Migrate any legacy non-UUID IDs (e.g. 'usr-...') to standard RFC UUIDs
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const legacyIdMap = new Map<string, string>();
          for (const u of parsed.users) {
            if (!uuidRegex.test(u.id)) {
              const newUuid = crypto.randomUUID();
              legacyIdMap.set(u.id, newUuid);
              (u as any).legacy_id = u.id;
              u.id = newUuid;
            }
          }
          if (legacyIdMap.size > 0 && Array.isArray(parsed.bookings)) {
            for (const b of parsed.bookings) {
              if (legacyIdMap.has(b.user_id)) {
                b.user_id = legacyIdMap.get(b.user_id)!;
              }
            }
          }

          // Guarantee all loaded users have password protection
          parsed.users = parsed.users.map((u: UserProfile) => ({
            ...u,
            password_hash: u.password_hash || DEFAULT_HASH,
            password_salt: u.password_salt || DEFAULT_SALT,
          }));

          // Persist back to file so the on-disk JSON is always up to date
          try {
            fs.writeFileSync(this.filePath, JSON.stringify(parsed, null, 2), "utf-8");
          } catch {}

          return parsed;
        }
      }
    } catch (e) {
      // Fallback silently to memory
    }

    const initial: LocalDatabaseSchema = {
      users: [...DEFAULT_USERS],
      slots: {},
      bookings: [],
    };
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2), "utf-8");
    } catch {}
    return initial;
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      // Memory persistence is sufficient if filesystem write fails
    }
  }

  // --- Users Operations ---
  public getUsers(sanitize: boolean = true): UserProfile[] {
    return this.data.users.map((u) => {
      if (sanitize) {
        const { password_hash, password_salt, ...safe } = u;
        return safe as UserProfile;
      }
      return { ...u };
    });
  }

  public findUserById(id: string, sanitize: boolean = true): UserProfile | undefined {
    const user = this.data.users.find((u) => u.id === id || (u as any).legacy_id === id);
    if (!user) return undefined;
    if (sanitize) {
      const { password_hash, password_salt, ...safe } = user;
      return safe as UserProfile;
    }
    return { ...user };
  }

  public findUserByEmailOrRegNo(
    identifier: string,
    regNo?: string,
    sanitize: boolean = true
  ): UserProfile | undefined {
    const clean = identifier.trim().toLowerCase();
    const cleanReg = regNo?.trim().toUpperCase();
    const mapped = FIXED_ACCOUNT_MAP[clean];
    const targetEmail = mapped?.email.toLowerCase() || clean;
    const targetRegNo = mapped?.regNo.toUpperCase();

    let user = this.data.users.find((u) => {
      const uEmail = u.email.toLowerCase();
      const uReg = (u.reg_no || "").toUpperCase();
      const uLegacy = (u as any).legacy_id;
      return (
        uEmail === clean ||
        uEmail === targetEmail ||
        (cleanReg && uReg === cleanReg) ||
        (targetRegNo && uReg === targetRegNo) ||
        uReg === clean.toUpperCase() ||
        (uLegacy && uLegacy === clean)
      );
    });

    // Self-healing: If user not found OR if this is a mapped system account whose hash is missing/outdated
    if (mapped) {
      const defUser = DEFAULT_USERS.find(
        (du) =>
          du.email.toLowerCase() === targetEmail ||
          (targetRegNo && du.reg_no.toUpperCase() === targetRegNo)
      );
      if (defUser) {
        if (!user) {
          user = { ...defUser };
          this.data.users.push(user);
          this.persist();
        } else if (
          user.password_hash !== defUser.password_hash ||
          user.password_salt !== defUser.password_salt
        ) {
          user.password_hash = defUser.password_hash;
          user.password_salt = defUser.password_salt;
          user.role = defUser.role;
          user.reg_no = defUser.reg_no;
          this.persist();
        }
      }
    }

    if (!user) return undefined;
    if (sanitize) {
      const { password_hash, password_salt, ...safe } = user;
      return safe as UserProfile;
    }
    return { ...user };
  }

  public registerUser(profile: {
    id?: string;
    name: string;
    regNo: string;
    email: string;
    dietaryPref?: DietaryPref;
    role?: "STUDENT" | "STAFF" | "ADMIN";
    passwordHash?: string;
    passwordSalt?: string;
  }): UserProfile {
    const existing = this.findUserByEmailOrRegNo(profile.email, profile.regNo, false);
    if (existing) {
      const { password_hash, password_salt, ...safe } = existing;
      return safe as UserProfile;
    }

    const newUser: UserProfile = {
      id: profile.id || crypto.randomUUID(),
      name: profile.name.trim(),
      reg_no: profile.regNo.trim().toUpperCase(),
      email: profile.email.trim().toLowerCase(),
      role: profile.role || "STUDENT",
      dietary_pref: profile.dietaryPref || "VEG",
      password_hash: profile.passwordHash || DEFAULT_HASH,
      password_salt: profile.passwordSalt || DEFAULT_SALT,
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
    const user = this.data.users.find((u) => u.id === id || (u as any).legacy_id === id);
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
