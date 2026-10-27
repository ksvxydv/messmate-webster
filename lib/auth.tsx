"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  reg_no: string;
  name: string;
  email: string;
  role: "STUDENT" | "STAFF" | "ADMIN";
  dietary_pref: "VEG" | "NON_VEG" | "JAIN";
}

// Fallback demo users if Supabase initial connection is delayed
const DEMO_USERS: UserProfile[] = [
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    reg_no: "20253137",
    name: "Keshav",
    email: "20253137@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "VEG",
  },
  {
    id: "e48ac10b-58cc-4372-a567-0e02b2c3d480",
    reg_no: "20253188",
    name: "Piyush Kumar Chaurasiya",
    email: "20253188@mnnit.ac.in",
    role: "STUDENT",
    dietary_pref: "NON_VEG",
  },
  {
    id: "d49ac10b-58cc-4372-a567-0e02b2c3d481",
    reg_no: "20253073",
    name: "Ayushi Chaudhary",
    email: "20253073@mnnit.ac.in",
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

interface RegisterPayload {
  name: string;
  regNo: string;
  email: string;
  dietaryPref: "VEG" | "NON_VEG" | "JAIN";
}

interface AuthContextType {
  currentUser: UserProfile | null;
  role: string;
  setRole: (role: string) => void;
  setCurrentUser: (user: UserProfile) => void;
  availableUsers: UserProfile[];
  loginWithEmail: (
    email: string,
  ) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  registerStudent: (
    payload: RegisterPayload,
  ) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  loginAsRole: (
    targetRole: "STUDENT" | "STAFF" | "ADMIN",
  ) => Promise<UserProfile | null>;
  logout: () => void;
  refreshUsers: () => Promise<UserProfile[]>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  role: "STUDENT",
  setRole: () => {},
  setCurrentUser: () => {},
  availableUsers: [],
  loginWithEmail: async () => ({ success: false }),
  registerStudent: async () => ({ success: false }),
  loginAsRole: async () => null,
  logout: () => {},
  refreshUsers: async () => [],
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string>("STUDENT");
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>(DEMO_USERS);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const { data: dbUsers } = await supabase.from("users").select("*");
      if (dbUsers && dbUsers.length > 0) {
        setAvailableUsers(dbUsers as UserProfile[]);
        return dbUsers as UserProfile[];
      }
    } catch (e) {
      console.warn("Error loading users from DB:", e);
    }
    return DEMO_USERS;
  }, []);

  // Initialize auth state
  useEffect(() => {
    async function loadAuth() {
      try {
        const usersList = await fetchUsers();

        // Check local storage for persisted session
        const savedUserId = typeof window !== "undefined"
          ? localStorage.getItem("messmate_user_id")
          : null;

        let matched = usersList.find((u) => u.id === savedUserId);
        if (!matched) {
          // Default to first student profile
          matched = usersList.find((u) => u.role === "STUDENT") || usersList[0];
        }

        if (matched) {
          setCurrentUser(matched);
          setRole(matched.role);
        }
      } catch (err) {
        console.error("Auth init fallback to mock:", err);
        setCurrentUser(DEMO_USERS[0]);
        setRole(DEMO_USERS[0].role);
      } finally {
        setLoading(false);
      }
    }
    loadAuth();
  }, [fetchUsers]);

  const loginWithEmail = useCallback(
    async (email: string) => {
      const cleanEmail = email.trim().toLowerCase();
      let user = availableUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail,
      );

      if (!user) {
        // Query Supabase live
        const { data } = await supabase
          .from("users")
          .select("*")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (data) {
          user = data as UserProfile;
        }
      }

      if (!user) {
        return {
          success: false,
          error: `No user account found for ${email}. Please check your email or register as a new student.`,
        };
      }

      setCurrentUser(user);
      setRole(user.role);
      if (typeof window !== "undefined") {
        localStorage.setItem("messmate_user_id", user.id);
      }
      return { success: true, user };
    },
    [availableUsers],
  );

  const registerStudent = useCallback(
    async (payload: RegisterPayload) => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "Registration failed." };
        }

        const newUser: UserProfile = data.user;
        await fetchUsers();
        setCurrentUser(newUser);
        setRole("STUDENT");
        if (typeof window !== "undefined") {
          localStorage.setItem("messmate_user_id", newUser.id);
        }
        return { success: true, user: newUser };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to reach registration server." };
      }
    },
    [fetchUsers]
  );

  const loginAsRole = useCallback(
    async (targetRole: "STUDENT" | "STAFF" | "ADMIN") => {
      const targetUser =
        availableUsers.find((u) => u.role === targetRole) ||
        DEMO_USERS.find((u) => u.role === targetRole) ||
        null;

      if (targetUser) {
        setCurrentUser(targetUser);
        setRole(targetUser.role);
        if (typeof window !== "undefined") {
          localStorage.setItem("messmate_user_id", targetUser.id);
        }
      }
      return targetUser;
    },
    [availableUsers],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("messmate_user_id");
    }
  }, []);

  const handleSetRole = useCallback((newRole: string) => {
    setRole(newRole);
    if (currentUser?.role !== newRole) {
      const matched = availableUsers.find((u) => u.role === newRole);
      if (matched) {
        setCurrentUser(matched);
        if (typeof window !== "undefined") {
          localStorage.setItem("messmate_user_id", matched.id);
        }
      }
    }
  }, [availableUsers, currentUser?.role]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        setRole: handleSetRole,
        setCurrentUser,
        availableUsers,
        loginWithEmail,
        registerStudent,
        loginAsRole,
        logout,
        refreshUsers: fetchUsers,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
