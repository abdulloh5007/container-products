
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as FirebaseAuthUser } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, getDocs, collection, query, where, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';

export type SessionRole = 'senior' | 'junior' | 'pending';

export interface AppUser {
    uid: string;
    role: SessionRole;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    photoURL?: string | null;
    currentSessionId?: string; 
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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (data: { name: string, phone: string }) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isManagementModeEnabled, setIsManagementModeEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loginState, setLoginState] = useState<LoginState>('form');

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

  const handleSuccessfulLogin = async (firebaseUser: FirebaseAuthUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    let userDocSnap = await getDoc(userDocRef);

    let userData: AppUser;

    if (!userDocSnap.exists()) {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "senior"));
      const seniorSnapshot = await getDocs(q);
      const newRole: SessionRole = seniorSnapshot.empty ? 'senior' : 'pending';

      userData = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'New User',
        email: firebaseUser.email,
        role: newRole,
      };
      await setDoc(userDocRef, userData);
    } else {
        userData = userDocSnap.data() as AppUser;
    }

    const sessionRef = await addDoc(collection(db, 'sessions'), {
        userId: userData.uid,
        userName: userData.name,
        loginTime: serverTimestamp(),
        device: 'Web',
        isActive: true
    });
    
    await updateDoc(userDocRef, { currentSessionId: sessionRef.id });

    setUser({ ...userData, currentSessionId: sessionRef.id });

    if (userData.role === 'pending') {
        setLoginState('pending');
    } else {
        setLoginState('form');
    }
  }


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await handleSuccessfulLogin(firebaseUser);
      } else {
        setUser(null);
        setLoginState('form');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  };
  
  const register = async (name: string, email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // We don't create the user doc here. 
    // onAuthStateChanged will fire and handleSuccessfulLogin will create the doc.
    // We just need to make sure the display name is available.
    // In a real app, you might want to call `updateProfile` on the firebaseUser object.
    // For simplicity, handleSuccessfulLogin will use the name from registration if doc doesn't exist.
    // Let's explicitly create the user doc here to pass the name.
     const usersRef = collection(db, "users");
     const q = query(usersRef, where("role", "==", "senior"));
     const seniorSnapshot = await getDocs(q);
     const newRole: SessionRole = seniorSnapshot.empty ? 'senior' : 'pending';
    
     const newUser: Omit<AppUser, 'currentSessionId'> = {
       uid: firebaseUser.uid,
       name: name,
       email: firebaseUser.email,
       role: newRole,
     };
    
    await setDoc(doc(db, "users", firebaseUser.uid), newUser);

    // onAuthStateChanged will now pick this up and create the session.
  };
  
  const logout = async () => {
    if (user && user.currentSessionId) {
        const sessionDocRef = doc(db, 'sessions', user.currentSessionId);
        await updateDoc(sessionDocRef, {
            isActive: false,
            logoutTime: serverTimestamp()
        }).catch(err => console.error("Error updating session on logout:", err));
    }

    try {
      await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
    } finally {
        setUser(null);
        setLoginState('form');
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
    login,
    register,
    logout,
    updateUserProfile,
    pendingRequests,
    setPendingRequests,
    isManagementModeEnabled,
    isLoadingSettings,
    toggleManagementMode,
    loginState,
  }), [user, isAuthLoading, pendingRequests, isManagementModeEnabled, isLoadingSettings, loginState]);

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
