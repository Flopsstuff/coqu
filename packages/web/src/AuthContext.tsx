import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthStatus, User } from "@coqu/shared";
import { apiFetch, clearToken, getToken, setToken } from "./api";

interface AuthState {
  user: User | null;
  needsSetup: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const statusRes = await apiFetch<AuthStatus>("/api/auth/status");
      if (statusRes.success && statusRes.data?.needsSetup) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }

      const token = getToken();
      if (token) {
        const meRes = await apiFetch<User>("/api/auth/me");
        if (meRes.success && meRes.data) {
          setUser(meRes.data);
        } else {
          clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  function login(token: string, newUser: User) {
    setToken(token);
    setUser(newUser);
    setNeedsSetup(false);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, needsSetup, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
