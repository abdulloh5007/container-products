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
    const sanitizedPhone = phone.replace(/\s+/g, '');
    const email = `${sanitizedPhone}@container.app`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Ensure user document exists in Firestore
    if (userCredential.user) {
        const userDocRef = doc(db, 'users', sanitizedPhone);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                name: '', // Initially empty
                phone: sanitizedPhone
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
