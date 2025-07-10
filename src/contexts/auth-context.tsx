'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// A simple user object, not the Firebase one
interface AppUser {
    phone: string;
    Name: string;
    role: string;
    password?: string;
}

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<AppUser>) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session storage on initial load
  useEffect(() => {
    try {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    } catch (error) {
        console.error("Could not parse user from session storage", error);
        sessionStorage.removeItem('user');
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = async (phone: string, password: string) => {
    const userId = phone.replace(/\D/g, ''); // Use phone number as user ID
    if (!userId) {
        throw new Error("Invalid phone number provided.");
    }
    
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.password === password) {
            const appUser: AppUser = {
                phone: userData.phone,
                Name: userData.Name,
                role: userData.role,
                password: userData.password,
            };
            setUser(appUser);
            sessionStorage.setItem('user', JSON.stringify(appUser));
        } else {
            throw new Error('Incorrect credentials');
        }
    } else {
        throw new Error('Incorrect credentials');
    }
  };
  
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    // Also remove from router to login page
    window.location.href = '/admin/login';
  };

  const updateUser = (data: Partial<AppUser>) => {
      setUser(prevUser => {
          if (!prevUser) return null;
          const newUser = { ...prevUser, ...data };
          sessionStorage.setItem('user', JSON.stringify(newUser));
          return newUser;
      });
  }

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
