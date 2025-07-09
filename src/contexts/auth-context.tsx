'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (phone: string, password: string) => {
    // Sanitize phone number to get the numeric part, which will be the user ID
    const userId = phone.replace(/\D/g, ''); // Removes all non-digit characters
    const emailForAuth = `${userId}@container.app`; // The email to use for Firebase Auth

    const userCredential = await signInWithEmailAndPassword(auth, emailForAuth, password);
    
    // Ensure user document exists in Firestore with correct structure
    if (userCredential.user) {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            // Create the user document on first login with default values
            await setDoc(userDocRef, {
                Name: 'Admin', // Using 'Name' as requested by the user
                phone: phone, // Store the original phone number string
                role: 'admin'
                // We DO NOT store the password here for security reasons.
            });
        }
    }
  };
  
  const logout = () => {
    signOut(auth);
  };

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
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
