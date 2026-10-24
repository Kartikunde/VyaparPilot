import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Business } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  token: string | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const u = await api.auth.getMe();
      setUser(u);
      const b = await api.business.getProfile();
      setBusiness(b);
    } catch (err) {
      console.error('Failed to load profile:', err);
      removeAuthToken();
      setToken(null);
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (credentials: any) => {
    setLoading(true);
    const res = await api.auth.login(credentials);
    setAuthToken(res.access_token);
    setToken(res.access_token);
    await fetchProfile();
  };

  const register = async (data: any) => {
    setLoading(true);
    const res = await api.auth.register(data);
    setAuthToken(res.access_token);
    setToken(res.access_token);
    await fetchProfile();
  };

  const demoLogin = async () => {
    setLoading(true);
    const res = await api.auth.demoLogin();
    setAuthToken(res.access_token);
    setToken(res.access_token);
    await fetchProfile();
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
    setBusiness(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    if (token) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        token,
        loading,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
