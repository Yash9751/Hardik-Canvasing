import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { authAPI } from '../services/api';

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for user data
const USER_STORAGE_KEY = '@traders_user';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data on app start
    checkStoredUser();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log('App state changed to:', nextAppState);
    
    // When app becomes active, recheck stored user data
    if (nextAppState === 'active') {
      checkStoredUser();
    }
  };

  const checkStoredUser = async () => {
    try {
      console.log('Checking stored user data...');
      
      // Debug: Check all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys:', allKeys);
      
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      console.log('Stored user data:', storedUser);
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('Setting user from storage:', userData);
        setUser(userData);
      } else {
        console.log('No stored user data found');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking stored user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      console.log('Attempting login for:', cleanUsername);
      const response = await authAPI.login({ username: cleanUsername, password: cleanPassword });
      
      if (response.data.message === 'Login successful') {
        const userData = {
          id: response.data.user.id,
          username: response.data.user.username,
        };
        
        console.log('Login successful, storing user data:', userData);
        
        // Store user data with proper error handling
        try {
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
          console.log('User data stored successfully');
        } catch (storageError) {
          console.error('Error storing user data:', storageError);
          // Continue anyway, user is still logged in for this session
        }
        
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear the user state even if storage fails
      setUser(null);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 