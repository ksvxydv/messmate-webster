"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  currentUser: any;
  role: string;
  setRole: (role: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  role: "STUDENT",
  setRole: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [role, setRole] = useState<string>("STUDENT");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.from("users").select("*").limit(1);
      if (data && data.length > 0) {
        setCurrentUser(data[0]);
        setRole(data[0].role);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, role, setRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
