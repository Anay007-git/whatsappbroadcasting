'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    logoUrl?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('eventblast_token');
    const storedUser = localStorage.getItem('eventblast_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('eventblast_token');
        localStorage.removeItem('eventblast_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('eventblast_token', newToken);
    localStorage.setItem('eventblast_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('eventblast_token');
    localStorage.removeItem('eventblast_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data);
      localStorage.setItem('eventblast_user', JSON.stringify(data));
    } catch {
      // Ignored
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
