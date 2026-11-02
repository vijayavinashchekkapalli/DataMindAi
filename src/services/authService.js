import { apiRequest } from "./api";

const TOKEN_KEY = "datamind-token";
const USER_KEY = "datamind-user";

export const readStoredToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const saveAuthSession = ({ token, user }) => {
  if (!token || !user) throw new Error("The server did not return a valid authentication session.");
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem("datamind-auth");
};

const unwrapAuthResponse = (response) => {
  const data = response?.data;
  if (!response?.success || !data?.token || !data?.user) {
    throw new Error(response?.message || "The server did not confirm authentication.");
  }
  return data;
};

export const login = async (credentials) => unwrapAuthResponse(await apiRequest("/api/auth/login", {
  method: "POST",
  body: credentials,
}));

export const signup = async (details) => {
  const response = await apiRequest("/api/auth/signup", { method: "POST", body: details });
  if (!response?.success) throw new Error(response?.message || "Signup failed.");
  return response;
};

export const loginWithGoogle = async (credential) => {
  if (!credential) throw new Error("Google did not return an identity credential.");
  return unwrapAuthResponse(await apiRequest("/api/auth/google", {
    method: "POST",
    body: { token: credential },
  }));
};

export const getCurrentUser = async (token) => {
  const response = await apiRequest("/api/auth/me", { token });
  if (!response?.success || !response.data) throw new Error("The saved session is no longer valid.");
  return response.data;
};

export const logoutRequest = async (token) => {
  if (!token) return;
  await apiRequest("/api/auth/logout", { method: "POST", token });
};
