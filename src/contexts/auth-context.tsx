
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';

interface AppUser {
    phone: string;
    Name: string;
    role: string;
    password?: string;
    sessionToken?: string;
}

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password:string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<AppUser>) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to generate a random token
const generateSessionToken = () => {
    return [...Array(30)].map(() => Math.random().toString(36)[2]).join('');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check local storage on initial load
  useEffect(() => {
    const validateSession = async () => {
        try {
            const storedUserString = localStorage.getItem('user');
            if (storedUserString) {
                const storedUser: AppUser = JSON.parse(storedUserString);
                
                if (storedUser.phone && storedUser.sessionToken) {
                    const userId = storedUser.phone.replace(/\D/g, '');
                    const userDocRef = doc(db, 'users', userId);
                    const userDocSnap = await getDoc(userDocRef);

                    // Check if the token in localStorage exists in the Firestore tokens array
                    if (userDocSnap.exists() && userDocSnap.data().sessionTokens?.includes(storedUser.sessionToken)) {
                        setUser(storedUser);
                    } else {
                        // If token is not valid, clear the stale session
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                }
            }
        } catch (error) {
            console.error("Could not validate session", error);
            localStorage.removeItem('user');
        } finally {
            setIsLoading(false);
        }
    }
    
    validateSession();
  }, []);

  const login = async (phone: string, password: string): Promise<boolean> => {
    const userId = phone.replace(/\D/g, '');
    if (!userId || !password) {
        return false;
    }
    
    setIsLoading(true);
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().password === password) {
            const userData = userDocSnap.data();
            const sessionToken = generateSessionToken();

            // Manage session tokens array in Firestore
            let sessionTokens = userData.sessionTokens || [];
            sessionTokens.push(sessionToken);
            if (sessionTokens.length > 3) {
                sessionTokens.shift(); // Remove the oldest token
            }

            await updateDoc(userDocRef, {
                sessionTokens: sessionTokens,
                lastLogin: serverTimestamp(),
            });

            const appUser: AppUser = {
                phone: userData.phone,
                Name: userData.Name,
                role: userData.role,
                password: userData.password,
                sessionToken: sessionToken,
            };

            setUser(appUser);
            localStorage.setItem('user', JSON.stringify(appUser));
            return true;
        }
        return false;
    } catch (error) {
        console.error("Firestore error during login:", error);
        return false;
    } finally {
        setIsLoading(false);
    }
  };
  
  const logout = async () => {
    const currentUser = user;
    if (!currentUser || !currentUser.sessionToken) return;
    
    setIsLoading(true);
    try {
        const userId = currentUser.phone.replace(/\D/g, '');
        const userDocRef = doc(db, 'users', userId);
        
        // Remove the specific session token from Firestore
        await updateDoc(userDocRef, {
            sessionTokens: arrayRemove(currentUser.sessionToken)
        });
    } catch (error) {
        console.error("Error clearing session token from Firestore", error);
    } finally {
        setUser(null);
        localStorage.removeItem('user');
        setIsLoading(false);
        // Using window.location to ensure a full refresh and state clear
        window.location.href = '/admin/login';
    }
  };

  const updateUser = (data: Partial<AppUser>) => {
      setUser(prevUser => {
          if (!prevUser) return null;
          const newUser = { ...prevUser, ...data };
          localStorage.setItem('user', JSON.stringify(newUser));
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
