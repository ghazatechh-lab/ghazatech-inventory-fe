import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import api, { unwrap } from "@/lib/api";
import { toast } from "sonner";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const r = await api.get("/auth/me/");
      setUser(unwrap(r));
    } catch {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email_or_username, password) => {
    // Remove old/expired tokens before login
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    const r = await api.post("/auth/login/", {
      email_or_username: email_or_username.trim(),
      password,
    });

    const data = unwrap(r);

    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    setUser(data.user);

    toast.success(`Welcome back, ${data.user.full_name || data.user.username}`);
    navigate("/dashboard");

    return data.user;
  };
  const logout = async () => {
    try {
      await api.post("/auth/logout/");
    } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    navigate("/login");
  };

  const [branchOverride, setBranchOverride] = useState(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refresh: loadMe,
        branchOverride,
        setBranchOverride,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
