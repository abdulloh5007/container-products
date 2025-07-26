
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as FirebaseAuthUser, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, getDocs, collection, query, onSnapshot, arrayUnion, arrayRemove, Timestamp, writeBatch } from 'firebase/firestore';
import { translations } from '@/lib/translations';
import { useRouter } from 'next/navigation';
import * as idb from '@/lib/indexed-db';


export type SessionRole = 'senior' | 'junior' | 'worker' | 'pending';
export type ViewMode = 'classic' | 'modern';

export interface Session {
    id: string; 
    name?: string;
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

export type LoginState = 'form' | 'pending' | 'failed' | 'no_account' | 'access_denied';

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isRegistrationAllowed: boolean;
  pendingRequests: number;
  isManagementModeEnabled: boolean;
  isLoadingSettings: boolean;
  loginState: LoginState;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  setLoginState: (state: LoginState) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { name: string, phone: string }) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  setPendingRequests: (count: number) => void;
  toggleManagementMode: () => Promise<void>;
  approveSession: (session: Session, name: string, role: Exclude<SessionRole, 'pending' | 'senior'>) => Promise<void>;
  deleteSession: (session: Session) => Promise<void>;
  updateUserRole: (session: Session, name: string, role: 'junior' | 'worker') => Promise<void>;
  translateFirebaseError: (errorCode: string) => string;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const getDeviceName = (): string => {
    if (typeof window === 'undefined') {
        return 'Unknown Server';
    }
    const { userAgent } = navigator;
    if (/android/i.test(userAgent)) return "Android Device";
    if (/iPad|iPhone|iPod/.test(userAgent)) return "iOS Device";
    if (/windows phone/i.test(userAgent)) return "Windows Phone";
    if (/macintosh|mac os x/i.test(userAgent)) return "Mac";
    if (/windows/i.test(userAgent)) return "Windows PC";
    if (/linux/i.test(userAgent)) return "Linux PC";
    
    return "Web Browser";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isManagementModeEnabled, setIsManagementModeEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loginState, setLoginState] = useState<LoginState>('form');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<keyof typeof translations>('ru');
  const [viewMode, setViewModeState] = useState<ViewMode>('classic');
  const router = useRouter();
  
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    idb.set('viewMode', mode);
  };
  
  useEffect(() => {
    const loadPersistedData = async () => {
      const storedViewMode = await idb.get<ViewMode>('viewMode');
      if (storedViewMode === 'classic' || storedViewMode === 'modern') {
        setViewModeState(storedViewMode);
      }
      const storedLang = await idb.get<Language>('language');
      if (storedLang && (storedLang === 'ru' || storedLang === 'uz')) {
          setLanguage(storedLang);
      }
    }
    loadPersistedData();
  }, []);

  const translateFirebaseError = useCallback((errorCode: string): string => {
        const errorKey = `firebase_error_${errorCode.replace(/[^a-z0-9-]/g, '_')}` as keyof typeof translations.ru;
        const fallbackKey = 'firebase_error_unknown' as keyof typeof translations.ru;
        return translations[language][errorKey] || translations[language][fallbackKey];
  }, [language]);
  
  useEffect(() => {
    const checkUsers = async () => {
        setIsAuthLoading(true);
        try {
            const usersCollectionRef = collection(db, 'users');
            const snapshot = await getDocs(query(usersCollectionRef));
            setIsRegistrationAllowed(snapshot.empty);
        } catch (error) {
            console.error("Error checking for users:", error);
            setIsRegistrationAllowed(false);
        } finally {
            setIsAuthLoading(false);
        }
    };
    checkUsers();
  }, [])

  useEffect(() => {
    const initializeSession = async () => {
      let sessionId = await idb.get<string>('currentSessionId');
      if (!sessionId) {
          // If a senior logged out on this device, let's restore their session automatically
          const seniorSessionId = await idb.get<string>('seniorSessionId');
          if (seniorSessionId) {
              sessionId = seniorSessionId;
              await idb.set('currentSessionId', sessionId);
          }
      }
      setCurrentSessionId(sessionId || null);
    };

    initializeSession();
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

    if (isAuthLoading) {
      // Defer auth subscription until client-side session is initialized
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && currentSessionId) {
             const userDocRef = doc(db, "users", firebaseUser.uid);
             const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data() as Omit<AppUser, 'currentSession'>;
                    const sessions = userData.sessions || [];
                    const currentSession = sessions.find(s => s.id === currentSessionId) || null;
                    
                    if (currentSession) {
                        if (currentSession.role === 'pending') {
                            setLoginState('pending');
                        } else {
                            setLoginState('form');
                        }
                        setUser({ ...userData, uid: firebaseUser.uid, currentSession });
                        const pendingCount = sessions.filter(s => s.role === 'pending').length;
                        setPendingRequests(pendingCount);
                    } else {
                       signOut(auth); 
                    }
                } else {
                   signOut(auth);
                }
                setIsAuthLoading(false);
            });
            return () => unsubscribeUser();
        } else {
            setUser(null);
            if (currentSessionId) {
                // If there's a session ID but no firebase user, it's invalid.
                idb.del('currentSessionId');
                setCurrentSessionId(null);
            }
            setLoginState('form');
            setIsAuthLoading(false);
        }
    });

    return () => {
        unsubscribeAuth();
        unsubscribeSettings();
    }
  }, [currentSessionId, isAuthLoading]);
  
  const login = async (email: string, password: string) => {
    setLoginState('form');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password).catch(error => {
      throw new Error(translateFirebaseError(error.code));
    });

    const firebaseUser = userCredential.user;
    
    // There is only one user document, find it
    const usersCollection = await getDocs(collection(db, 'users'));
    if (usersCollection.empty) {
        setLoginState('no_account');
        await signOut(auth);
        throw new Error(translateFirebaseError('auth/user-not-found'));
    }
    const userDocRef = usersCollection.docs[0].ref;
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists() || userDocSnap.id !== firebaseUser.uid) {
        // This should not happen if there's only one user, but as a safeguard.
        setLoginState('no_account');
        await signOut(auth);
        throw new Error(translateFirebaseError('auth/user-not-found'));
    }
    
    const userData = userDocSnap.data();
    const sessions = userData.sessions || [];
    
    // THE CRITICAL CHECK: First check IndexedDB for a senior session "key"
    const seniorSessionIdFromDb = await idb.get<string>('seniorSessionId');

    if (seniorSessionIdFromDb) {
        const seniorSessionInFirestore = sessions.find((s: Session) => s.id === seniorSessionIdFromDb && s.role === 'senior');
        if (seniorSessionInFirestore) {
            // This is the senior re-logging into their privileged session.
            await idb.set('currentSessionId', seniorSessionInFirestore.id);
            setCurrentSessionId(seniorSessionInFirestore.id);
            return;
        }
    }
    
    // If no senior key, or key is invalid, this is a new device/session that needs approval.
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
    
    await idb.set('currentSessionId', newSessionId);
    setCurrentSessionId(newSessionId);
    setLoginState('pending');
  };
  
  const register = async (name: string, email: string, password: string) => {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef);
    const snapshot = await getDocs(q);

    if (!snapshot.empty && !isRegistrationAllowed) {
        throw new Error("Registration is not allowed.");
    }

    // Only the very first user ever becomes senior automatically.
    const isFirstUser = snapshot.empty;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password).catch(error => {
      throw new Error(translateFirebaseError(error.code));
    });
    
    const firebaseUser = userCredential.user;

    const newSessionId = generateSessionId();
    const newSession: Session = {
        id: newSessionId,
        deviceName: getDeviceName(),
        name: name,
        role: isFirstUser ? 'senior' : 'pending',
        createdAt: Timestamp.now()
    }

    const newUserDoc: Omit<AppUser, 'currentSession' | 'uid'> = {
       name: name,
       email: firebaseUser.email,
       sessions: [newSession]
    };
    
    await setDoc(doc(db, "users", firebaseUser.uid), newUserDoc);
    
    await idb.set('currentSessionId', newSessionId);
    if(isFirstUser) {
        await idb.set('seniorSessionId', newSessionId);
    }

    setCurrentSessionId(newSessionId);
    if (newSession.role === 'pending') {
        setLoginState('pending');
    }
  };
  
  const logout = async () => {
    if (user && user.currentSession) {
        const sessionToLogout = user.currentSession;
        const userDocRef = doc(db, 'users', user.uid);
        
        if (sessionToLogout.role === 'senior') {
            // Preserve the senior session ID for quick re-login
            await idb.set('seniorSessionId', sessionToLogout.id);
        } else {
            // For other roles, remove the session from Firestore
            await updateDoc(userDocRef, { sessions: arrayRemove(sessionToLogout) });
        }
        // Always clear the current active session ID
        await idb.del('currentSessionId');
    }
    
    await signOut(auth);
    setCurrentSessionId(null); // Triggers re-evaluation of auth state
  };

  const updateUserProfile = async (data: { name: string, phone: string }) => {
    if (!user) throw new Error("User not authenticated");
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { name: data.name, phone: data.phone });
  };

  const updateUserPassword = async (newPassword: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !user?.currentSession) {
        throw new Error(translateFirebaseError('auth/user-not-found'));
    }
    try {
        await updatePassword(firebaseUser, newPassword);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        // On password change, log out all other sessions for security
        await updateDoc(userDocRef, { sessions: [user.currentSession] });
        await idb.del('seniorSessionId'); // Force re-auth on other devices
    } catch (error: any) {
        throw new Error(translateFirebaseError(error.code));
    }
  };

  const toggleManagementMode = async () => {
    if (user?.currentSession?.role !== 'senior') return;
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
  
  const approveSession = async (session: Session, name: string, role: Exclude<SessionRole, 'pending' | 'senior'>) => {
    if (!user) throw new Error("User not authenticated");
    const userDocRef = doc(db, 'users', user.uid);
    
    const newSessions = user.sessions.map(s => 
        s.id === session.id ? { ...s, role, name } : s
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
  
  const updateUserRole = async (session: Session, name: string, role: 'junior' | 'worker') => {
    if (!user) throw new Error("User not authenticated");
    const userDocRef = doc(db, 'users', user.uid);

    const newSessions = user.sessions.map(s => 
        s.id === session.id ? { ...s, name, role } : s
    );
    
    await updateDoc(userDocRef, { sessions: newSessions });
  };

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user && user.currentSession?.role !== 'pending',
    isAuthLoading,
    isRegistrationAllowed,
    login,
    register,
    logout,
    updateUserProfile,
    updateUserPassword,
    pendingRequests,
    setPendingRequests: (count: number) => setPendingRequests(count),
    isManagementModeEnabled,
    isLoadingSettings,
    toggleManagementMode,
    loginState,
    setLoginState,
    approveSession,
    deleteSession,
    updateUserRole,
    translateFirebaseError,
    viewMode,
    setViewMode,
  }), [user, isAuthLoading, isRegistrationAllowed, pendingRequests, isManagementModeEnabled, isLoadingSettings, loginState, viewMode, translateFirebaseError]);

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

