"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { UserProfile, UserRole, RegisterPayload } from "@/types";
import { DEMO_USERS } from "@/config/constants";

export { DEMO_USERS };
export type { UserProfile, UserRole, RegisterPayload };

interface AuthContextType {
  currentUser: UserProfile | null;
  role: string;
  token: string | null;
  isDemoEnabled: boolean;
  setRole: (role: string) => void;
  setCurrentUser: (user: UserProfile | null) => void;
  availableUsers: UserProfile[];
  loginWithCredentials: (
    email: string,
    password?: string
  ) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  loginWithEmail: (
    email: string,
    password?: string
  ) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  registerStudent: (
    payload: RegisterPayload
  ) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  loginAsRole: (
    targetRole: "STUDENT" | "STAFF" | "ADMIN"
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
  isDemoEnabled: false,
  setRole: () => {},
  setCurrentUser: () => {},
  availableUsers: [],
  loginWithCredentials: async () => ({ success: false }),
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

export const isDemoEnabled =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO_CONTROLS === "true" &&
  process.env.NODE_ENV !== "production";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string>("STUDENT");
  const [token, setToken] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const activeToken = token || getStoredAuthToken();
      if (!activeToken) return [];
      const res = await fetch("/api/auth/session?all=true", {
        headers: { Authorization: `Bearer ${activeToken}`, "x-messmate-session": activeToken },
      });
      const json = await res.json();
      if (json && Array.isArray(json.users)) {
        setAvailableUsers(json.users as UserProfile[]);
        return json.users as UserProfile[];
      }
    } catch {}
    return [];
  }, [token]);

  // Initialize auth state securely
  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = getStoredAuthToken();
        if (storedToken) {
          // Verify existing session against the server
          const res = await fetch("/api/auth/session", {
            headers: {
              Authorization: `Bearer ${storedToken}`,
              "x-messmate-session": storedToken,
            },
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            setCurrentUser(data.user);
            setRole(data.user.role);
            setToken(storedToken);
            setLoading(false);
            return;
          } else {
            // Invalid/expired token
            localStorage.removeItem("messmate_auth_token");
            localStorage.removeItem("messmate_user_id");
          }
        }

        // If in explicit demo mode and no active session, optionally initialize demo profile
        if (isDemoEnabled) {
          setCurrentUser(DEMO_USERS[0]);
          setRole(DEMO_USERS[0].role);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn("[auth] Session initialization check:", err);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadAuth();
  }, []);

  const loginWithCredentials = useCallback(
    async (email: string, password?: string) => {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.user) {
          return {
            success: false,
            error: data.error || "Authentication failed. Please verify your credentials.",
          };
        }

        setCurrentUser(data.user);
        setRole(data.user.role);
        setToken(data.token);

        if (typeof window !== "undefined") {
          localStorage.setItem("messmate_user_id", data.user.id);
          localStorage.setItem("messmate_auth_token", data.token);
        }

        return { success: true, user: data.user };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || "Failed to reach authentication server.",
        };
      }
    },
    []
  );

  const loginWithEmail = loginWithCredentials;

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
    []
  );

  const loginAsRole = useCallback(
    async (targetRole: "STUDENT" | "STAFF" | "ADMIN") => {
      if (!isDemoEnabled) {
        return null;
      }

      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demoRole: targetRole }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          setRole(data.user.role);
          setToken(data.token);
          if (typeof window !== "undefined") {
            localStorage.setItem("messmate_user_id", data.user.id);
            localStorage.setItem("messmate_auth_token", data.token);
          }
          return data.user;
        }
      } catch {}
      return null;
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    setRole("STUDENT");
    if (typeof window !== "undefined") {
      localStorage.removeItem("messmate_user_id");
      localStorage.removeItem("messmate_auth_token");
      document.cookie = "messmate_token=; path=/; max-age=0";
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
  }, []);

  const handleSetRole = useCallback(
    async (newRole: string) => {
      if (!isDemoEnabled) return;
      await loginAsRole(newRole as any);
    },
    [loginAsRole]
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
        isDemoEnabled,
        setRole: handleSetRole,
        setCurrentUser,
        availableUsers,
        loginWithCredentials,
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
