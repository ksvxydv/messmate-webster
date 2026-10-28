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
import { UserProfile, UserRole, RegisterPayload } from "@/types";
import { DEMO_USERS } from "@/config/constants";

export { DEMO_USERS };
export type { UserProfile, UserRole, RegisterPayload };

interface AuthContextType {
  currentUser: UserProfile | null;
  role: string;
  token: string | null;
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
  getAuthHeaders: () => HeadersInit;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  role: "STUDENT",
  token: null,
  setRole: () => {},
  setCurrentUser: () => {},
  availableUsers: [],
  loginWithEmail: async () => ({ success: false }),
  registerStudent: async () => ({ success: false }),
  loginAsRole: async () => null,
  logout: () => {},
  refreshUsers: async () => [],
  loading: true,
  getAuthHeaders: () => ({}),
});

export function getStoredAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("messmate_auth_token");
  }
  return null;
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredAuthToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      "x-messmate-session": token,
    };
  }
  return {};
}

async function requestServerSessionToken(user: UserProfile): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      if (typeof window !== "undefined") {
        localStorage.setItem("messmate_auth_token", data.token);
      }
      return data.token;
    }
  } catch (err) {
    console.warn("[auth] Failed to retrieve server session token:", err);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string>("STUDENT");
  const [token, setToken] = useState<string | null>(null);
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
        const savedUserId =
          typeof window !== "undefined"
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
          const sToken = await requestServerSessionToken(matched);
          if (sToken) setToken(sToken);
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
      const sToken = await requestServerSessionToken(user);
      if (sToken) setToken(sToken);

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
          if (data.token) {
            localStorage.setItem("messmate_auth_token", data.token);
            setToken(data.token);
          }
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
        const sToken = await requestServerSessionToken(targetUser);
        if (sToken) setToken(sToken);
      }
      return targetUser;
    },
    [availableUsers],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("messmate_user_id");
      localStorage.removeItem("messmate_auth_token");
    }
  }, []);

  const handleSetRole = useCallback(
    async (newRole: string) => {
      setRole(newRole);
      if (currentUser?.role !== newRole) {
        const matched = availableUsers.find((u) => u.role === newRole);
        if (matched) {
          setCurrentUser(matched);
          if (typeof window !== "undefined") {
            localStorage.setItem("messmate_user_id", matched.id);
          }
          const sToken = await requestServerSessionToken(matched);
          if (sToken) setToken(sToken);
        }
      }
    },
    [availableUsers, currentUser?.role],
  );

  const contextGetAuthHeaders = useCallback((): HeadersInit => {
    const activeToken = token || getStoredAuthToken();
    if (activeToken) {
      return {
        Authorization: `Bearer ${activeToken}`,
        "x-messmate-session": activeToken,
      };
    }
    return {};
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        token,
        setRole: handleSetRole,
        setCurrentUser,
        availableUsers,
        loginWithEmail,
        registerStudent,
        loginAsRole,
        logout,
        refreshUsers: fetchUsers,
        loading,
        getAuthHeaders: contextGetAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
