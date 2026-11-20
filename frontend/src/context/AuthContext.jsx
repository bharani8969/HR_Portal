import { createContext, useContext, useEffect, useState } from "react";
import { api, setUnauthorizedHandler } from "../services/apiClient.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export const homeFor = (user) => (user?.role === "ADMIN" ? "/admin" : "/dashboard");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => api("/auth/me").then((d) => { setUser(d.user); return d.user; }).catch(() => { setUser(null); return null; });
  useEffect(() => {
    refresh().finally(() => setLoading(false));
    setUnauthorizedHandler(() => { sessionStorage.setItem("expired", "1"); setUser(null); }); // any 401 => back to the login page
  }, []);

  const signedIn = (u) => { sessionStorage.setItem("welcome", "1"); setUser(u); return u; };
  // Returns { mfaRequired: true } when a code is needed, otherwise the signed-in user.
  const login = async (email, password) => {
    const d = await api("/auth/login", { method: "POST", body: { email, password } });
    return d.mfaRequired ? { mfaRequired: true } : signedIn(d.user);
  };
  const verifyMfa = async (code) => signedIn((await api("/auth/mfa/verify", { method: "POST", body: { code } })).user);
  const logout = async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, verifyMfa, logout, refresh }}>{children}</Ctx.Provider>;
}
