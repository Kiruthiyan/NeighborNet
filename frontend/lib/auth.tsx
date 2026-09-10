"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  getMe,
  getStoredToken,
  login as apiLogin,
  setStoredToken,
  signup as apiSignup,
  type UserProfile
} from "./api";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  /** Returns the dev-only OTP when email delivery isn't configured (null
   * once real SMTP is set up, since it's actually emailed then). */
  signup: (
    name: string,
    email: string,
    password: string,
    inviteToken?: string
  ) => Promise<string | null>;
  logout: () => void;
  setUser: (user: UserProfile) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const profile = await getMe();
      setUser(profile);
    } catch {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      if (!getStoredToken()) {
        setLoading(false);
        return;
      }
      try {
        const profile = await getMe();
        if (!cancelled) setUser(profile);
      } catch {
        // Stored token is invalid or expired - drop it silently.
        setStoredToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    setStoredToken(result.access_token);
    setUser(result.user);
    return result.user;
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string, inviteToken?: string) => {
      const result = await apiSignup(name, email, password, inviteToken);
      setStoredToken(result.access_token);
      setUser(result.user);
      return result.dev_otp;
    },
    []
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
