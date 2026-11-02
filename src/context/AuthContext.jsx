import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  clearAuthSession,
  getCurrentUser as fetchCurrentUser,
  login as loginRequest,
  loginWithGoogle as googleLoginRequest,
  logoutRequest,
  readStoredToken,
  saveAuthSession,
} from "../services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutInProgress, setLogoutInProgress] = useState(false);
  const location = useLocation();

  const refreshUser = useCallback(async () => {
    const token = readStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const currentUser = await fetchCurrentUser(token);
      window.localStorage.setItem("datamind-user", JSON.stringify(currentUser));
      window.localStorage.setItem("datamind-auth", "true");
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      clearAuthSession();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const establishSession = useCallback(async (authenticate) => {
    const authData = await authenticate();
    saveAuthSession(authData);
    setUser(authData.user);
    window.localStorage.setItem("datamind-auth", "true");
    return authData.user;
  }, []);

  const login = useCallback((credentials) => establishSession(() => loginRequest(credentials)), [establishSession]);
  const loginWithGoogle = useCallback((credential) => establishSession(() => googleLoginRequest(credential)), [establishSession]);

  const logout = useCallback(async () => {
    setLogoutInProgress(true);
    const token = readStoredToken();
    try {
      await logoutRequest(token);
    } catch (error) {
      // Always clear the client session even if the server is temporarily unavailable.
      console.warn("Logout request failed:", error.message);
    } finally {
      clearAuthSession();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (logoutInProgress && !location.pathname.startsWith("/dashboard")) {
      setLogoutInProgress(false);
    }
  }, [location.pathname, logoutInProgress]);

  useEffect(() => {
    refreshUser();
    const syncSession = (event) => {
      if (event.key === "datamind-token" || event.key === "datamind-user") refreshUser();
    };
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [refreshUser]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user && readStoredToken()),
    loading,
    logoutInProgress,
    login,
    loginWithGoogle,
    logout,
    refreshUser,
  }), [user, loading, logoutInProgress, login, loginWithGoogle, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
