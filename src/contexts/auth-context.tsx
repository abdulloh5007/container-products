
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, User as FirebaseAuthUser } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, getDocs, collection, query, where, onSnapshot } from 'firebase/firestore';

export type SessionRole = 'senior' | 'junior' | 'pending';

export interface Session {
    role: SessionRole;
    sessionToken: string;
    deviceName: string;
    date: string;
}

export interface AppUser {
    uid: string;
    role?: SessionRole;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    photoURL?: string | null;
    currentSession?: Session; // Kept for potential compatibility, but role is now top-level
}

export type LoginState = 'form' | 'pending' | 'failed';

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  pendingRequests: number;
  isManagementModeEnabled: boolean;
  isLoadingSettings: boolean;
  loginState: LoginState;
  setPendingRequests: (count: number) => void;
  toggleManagementMode: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUserProfile: (data: { name: string, phone: string }) => Promise<void>;
  listenForApproval: (uid: string, session: Session) => () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isManagementModeEnabled, setIsManagementModeEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loginState, setLoginState] = useState<LoginState>('form');

  // Listen for global settings like management mode
  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setIsManagementModeEnabled(!!docSnap.data().isManagementModeEnabled);
        } else {
            setIsManagementModeEnabled(true);
        }
        setIsLoadingSettings(false);
    }, () => {
        setIsManagementModeEnabled(true);
        setIsLoadingSettings(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as AppUser;
          if (userData.role === 'pending') {
            setUser(userData);
            setLoginState('pending');
          } else {
            setUser(userData);
            setLoginState('form');
          }
        } else {
          // This case should ideally be handled by signInWithGoogle,
          // but as a fallback, we can treat them as pending.
          const newUser: AppUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              role: 'pending',
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
          setLoginState('pending');
        }
      } else {
        setUser(null);
        setLoginState('form');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const listenForApproval = useCallback((uid: string) => {
    const userDocRef = doc(db, 'users', uid);
    return onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data() as AppUser;
            if (userData.role !== 'pending') {
                setUser(userData);
                setLoginState('form');
            }
        }
    });
  }, []);


  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // This is a new user (registration)
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "senior"));
        const seniorSnapshot = await getDocs(q);
        
        const newRole: SessionRole = seniorSnapshot.empty ? 'senior' : 'pending';

        const newUser: AppUser = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          role: newRole,
          phone: '',
        };
        
        await setDoc(userDocRef, newUser);
        // Let onAuthStateChanged handle setting the user state
      } else {
        // Existing user, just update last login
        await updateDoc(userDocRef, {
            lastLogin: serverTimestamp(),
        });
        // Let onAuthStateChanged handle setting the user state
      }
    } catch (error) {
      console.error("Error during Google Sign-In:", error);
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
    } finally {
        setUser(null);
        setLoginState('form');
        // No need for window.location.href, component will re-render
    }
  };

  const updateUserProfile = async (data: { name: string, phone: string }) => {
    if (!user) {
        throw new Error("User not authenticated");
    }
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
        name: data.name,
        phone: data.phone,
    });
    setUser(prev => prev ? ({ ...prev, name: data.name, phone: data.phone }) : null);
  };

  const toggleManagementMode = async () => {
    const settingsDocRef = doc(db, 'settings', 'global');
    try {
        await updateDoc(settingsDocRef, {
            isManagementModeEnabled: !isManagementModeEnabled
        });
    } catch (error) {
        if ((error as any).code === 'not-found') {
            await setDoc(settingsDocRef, {
                isManagementModeEnabled: !isManagementModeEnabled
            });
        } else {
            console.error("Failed to toggle management mode", error);
            throw error;
        }
    }
  }


  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user && user.role !== 'pending',
    isAuthLoading,
    signInWithGoogle,
    logout,
    updateUserProfile,
    pendingRequests,
    setPendingRequests,
    isManagementModeEnabled,
    isLoadingSettings,
    toggleManagementMode,
    loginState,
    listenForApproval,
  }), [user, isAuthLoading, pendingRequests, isManagementModeEnabled, isLoadingSettings, loginState, listenForApproval]);

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
