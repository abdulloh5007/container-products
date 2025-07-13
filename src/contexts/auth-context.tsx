
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as FirebaseAuthUser } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, getDocs, collection, query, where, onSnapshot, arrayUnion, arrayRemove, Timestamp, writeBatch } from 'firebase/firestore';
import UAParser from 'ua-parser-js';

export type SessionRole = 'senior' | 'junior' | 'pending';

export interface Session {
    id: string; // Unique ID for the session, e.g., a random string or hash
    role: SessionRole;
    deviceName: string;
    createdAt: Timestamp;
}

export interface AppUser {
    uid: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    photoURL?: string | null;
    sessions: Session[];
    currentSession: Session | null;
}

export type LoginState = 'form' | 'pending' | 'failed' | 'no_account';

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  pendingRequests: number;
  isManagementModeEnabled: boolean;
  isLoadingSettings: boolean;
  loginState: LoginState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (data: { name: string, phone: string }) => Promise<void>;
  setPendingRequests: (count: number) => void;
  toggleManagementMode: () => Promise<void>;
  approveSession: (session: Session) => Promise<void>;
  deleteSession: (session: Session) => Promise<void>;
  makeSenior: (session: Session) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const getDeviceName = (): string => {
    if (typeof window === 'undefined') {
        return 'Unknown Server';
    }
    try {
        const parser = new UAParser();
        const result = parser.getResult();
        
        const browser = result.browser.name || 'Browser';
        const os = result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'OS';
        
        if (result.device.vendor) {
            return `${result.device.vendor} ${result.device.model || ''} (${os})`;
        }
        
        return `${browser} on ${os}`;
    } catch (error) {
        console.error("Error parsing user agent:", error);
        return "Web Browser";
    }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isManagementModeEnabled, setIsManagementModeEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loginState, setLoginState] = useState<LoginState>('form');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
        setCurrentSessionId(storedSessionId);
    }
  }, []);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'global');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
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

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
             const userDocRef = doc(db, "users", firebaseUser.uid);
             const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                let localSessionId = currentSessionId;
                 if (!localSessionId) {
                    localSessionId = localStorage.getItem('sessionId');
                    if (localSessionId) setCurrentSessionId(localSessionId);
                 }

                if (docSnap.exists()) {
                    const userData = docSnap.data() as Omit<AppUser, 'currentSession'>;
                    const sessions = userData.sessions || [];
                    const currentSession = sessions.find(s => s.id === localSessionId) || null;
                    
                    if (currentSession) {
                        if (currentSession.role === 'pending') {
                            setLoginState('pending');
                        } else {
                            setLoginState('form');
                        }
                        setUser({ ...userData, currentSession });
                        const pendingCount = sessions.filter(s => s.role === 'pending').length;
                        setPendingRequests(pendingCount);
                    } else {
                        // This can happen if the session was deleted by a senior user.
                        // Or if it's a new login without a session yet.
                        if (localSessionId) {
                           logout();
                        }
                    }

                } else {
                   // This case is for a user that exists in Auth but not in Firestore.
                   // We create the user doc on first login.
                   const newUserDoc: Omit<AppUser, 'currentSession' | 'sessions'> = {
                       uid: firebaseUser.uid,
                       email: firebaseUser.email,
                       name: firebaseUser.displayName || 'New User',
                       phone: firebaseUser.phoneNumber,
                   };
                   setDoc(userDocRef, { ...newUserDoc, sessions: [] });
                }
                setIsAuthLoading(false);
            });
            return () => unsubscribeUser();

        } else {
            setUser(null);
            setLoginState('form');
            setIsAuthLoading(false);
        }
    });

    return () => {
        unsubscribeAuth();
        unsubscribeSettings();
    }
  }, [currentSessionId]);
  
  const login = async (email: string, password: string) => {
    setLoginState('form');
    await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("Authentication failed.");

    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        setLoginState('no_account');
        await signOut(auth);
        throw new Error("No account found with this email.");
    }
    
    const newSessionId = generateSessionId();
    const newSession: Session = {
        id: newSessionId,
        deviceName: getDeviceName(),
        role: 'pending',
        createdAt: Timestamp.now()
    }
    
    await updateDoc(userDocRef, {
        sessions: arrayUnion(newSession)
    });
    
    localStorage.setItem('sessionId', newSessionId);
    setCurrentSessionId(newSessionId);
    setLoginState('pending');
  };
  
  const register = async (name: string, email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    const isFirstUser = usersSnapshot.empty;

    const newSessionId = generateSessionId();
    const newSession: Session = {
        id: newSessionId,
        deviceName: getDeviceName(),
        role: isFirstUser ? 'senior' : 'pending',
        createdAt: Timestamp.now()
    }

    const newUser: Omit<AppUser, 'currentSession'> = {
       uid: firebaseUser.uid,
       name: name,
       email: firebaseUser.email,
       sessions: [newSession]
    };
    
    await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    
    localStorage.setItem('sessionId', newSessionId);
    setCurrentSessionId(newSessionId);
  };
  
  const logout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    if (user && sessionId) {
        const userDocRef = doc(db, 'users', user.uid);
        const sessionToEnd = user.sessions.find(s => s.id === sessionId);
        if (sessionToEnd) {
            await updateDoc(userDocRef, {
                sessions: arrayRemove(sessionToEnd)
            }).catch(err => console.error("Error removing session on logout:", err));
        }
    }
    
    await signOut(auth);
    localStorage.removeItem('sessionId');
    setCurrentSessionId(null);
    setUser(null);
    setLoginState('form');
  };

  const updateUserProfile = async (data: { name: string, phone: string }) => {
    if (!user) throw new Error("User not authenticated");
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
        name: data.name,
        phone: data.phone,
    });
  };

  const toggleManagementMode = async () => {
    const settingsDocRef = doc(db, 'settings', 'global');
    try {
        await updateDoc(settingsDocRef, { isManagementModeEnabled: !isManagementModeEnabled });
    } catch (error) {
        if ((error as any).code === 'not-found') {
            await setDoc(settingsDocRef, { isManagementModeEnabled: !isManagementModeEnabled });
        } else {
            console.error("Failed to toggle management mode", error);
            throw error;
        }
    }
  };
  
  const approveSession = async (session: Session) => {
    if (!user) throw new Error("User not authenticated");
    const userDocRef = doc(db, 'users', user.uid);
    
    const newSessions = user.sessions.map(s => 
        s.id === session.id ? { ...s, role: 'junior' } : s
    );
    
    await updateDoc(userDocRef, { sessions: newSessions });
  }

  const deleteSession = async (session: Session) => {
    if (!user) throw new Error("User not authenticated");
    const userDocRef = doc(db, 'users', user.uid);

    const sessionToDelete = user.sessions.find(s => s.id === session.id);
    if (sessionToDelete) {
        await updateDoc(userDocRef, { sessions: arrayRemove(sessionToDelete) });
    }
  }
  
  const makeSenior = async (sessionToPromote: Session) => {
    if (!user || !user.currentSession) throw new Error("User not authenticated");
    const userDocRef = doc(db, 'users', user.uid);
    
    const batch = writeBatch(db);
    
    const newSessions = user.sessions.map(s => {
        if (s.id === sessionToPromote.id) return { ...s, role: 'senior' };
        if (s.id === user.currentSession?.id) return { ...s, role: 'junior' };
        return s;
    });

    batch.update(userDocRef, { sessions: newSessions });
    
    await batch.commit();
  }

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user && user.currentSession?.role !== 'pending',
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
    approveSession,
    deleteSession,
    makeSenior,
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
