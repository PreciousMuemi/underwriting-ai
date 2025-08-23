import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios, { type AxiosRequestConfig } from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  language_preference: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, language?: string) => Promise<{ success: boolean; error?: string }>;
  ensure: (payload?: { email?: string; name?: string; language_preference?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Logout function must be defined before use in interceptors
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  // Setup axios interceptor for authentication
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config: import('axios').InternalAxiosRequestConfig) => {
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => axios.interceptors.request.eject(interceptor);
  }, [token]);

  // Setup axios interceptor for handling 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && token) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  // Load token and user from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token is still valid
          try {
            await axios.get('/auth/profile', {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
          } catch (error) {
            // Token invalid, clear storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await axios.post<{ user: User; access_token: string }>('/auth/login', { email, password });
      
      const { user: userData, access_token } = response.data;
      
      setUser(userData);
      setToken(access_token);
      
      // Store in localStorage
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const ensure = async (
    payload?: { email?: string; name?: string; language_preference?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await axios.post<{ user: User; access_token: string }>(
        '/auth/ensure',
        payload || {}
      );
      const { user: userData, access_token } = response.data;
      setUser(userData);
      setToken(access_token);
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Ensure failed';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string, 
    email: string, 
    password: string, 
    language = 'en'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await axios.post('/auth/register', {
        name,
        email,
        password,
        language_preference: language
      });
      
      const { user: userData, access_token } = response.data;
      
      setUser(userData);
      setToken(access_token);
      
      // Store in localStorage
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.put('/auth/profile', data);
      
      const { user: userData } = response.data;
      setUser(userData);
      
      // Update localStorage
      localStorage.setItem('auth_user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    login,
    register,
    ensure,
    logout,
    updateProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};