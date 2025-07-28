
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
    isManagementModeEnabled?: boolean;
}

export type LoginState = 'form' | 'pending' | 'failed' | 'no_account' | 'access_denied';

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRegistrationAllowed: boolean;
  toggleManagementMode: () => Promise<void>;
  loginState: LoginState;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  setLoginState: (state: LoginState) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { name: string, phone: string }) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState(false);
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
      const storedLang = await idb.get<any>('language');
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
        setIsLoading(true);
        try {
            const usersCollectionRef = collection(db, 'users');
            const snapshot = await getDocs(query(usersCollectionRef));
            setIsRegistrationAllowed(snapshot.empty);
        } catch (error) {
            console.error("Error checking for users:", error);
            setIsRegistrationAllowed(false);
        } finally {
            setIsLoading(false);
        }
    };
    checkUsers();
  }, [])

  useEffect(() => {
    const initializeSession = async () => {
      const sessionId = await idb.get<string>('currentSessionId');
      setCurrentSessionId(sessionId || null);
    };

    initializeSession();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && currentSessionId) {
             const userDocRef = doc(db, "users", firebaseUser.uid);
             const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data() as Omit<AppUser, 'currentSession'>;
                    const sessions = userData.sessions || [];
                    const currentSession = sessions.find(s => s.id === currentSessionId) || null;
                    
                    if (currentSession) {
                        const appUser = { ...userData, uid: firebaseUser.uid, currentSession };
                        setUser(appUser);

                        if (currentSession.role === 'pending') {
                            setLoginState('pending');
                            idb.set('isAuthenticated', false);
                        } else {
                            setLoginState('form');
                            idb.set('isAuthenticated', true);
                        }
                    } else {
                       signOut(auth);
                    }
                } else {
                   signOut(auth);
                }
                setIsLoading(false);
            });
            return () => unsubscribeUser();
        } else {
            setUser(null);
            idb.del('currentSessionId');
            idb.del('isAuthenticated');
            setCurrentSessionId(null);
            setLoginState('form');
            setIsLoading(false);
        }
    });

    return () => unsubscribeAuth();
  }, [currentSessionId]);
  
  const login = async (email: string, password: string) => {
    setLoginState('form');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password).catch(error => {
      throw new Error(translateFirebaseError(error.code));
    });

    const firebaseUser = userCredential.user;
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        setLoginState('no_account');
        await signOut(auth);
        throw new Error(translateFirebaseError('auth/user-not-found'));
    }
    
    // Check for a saved senior session ID first
    const seniorSessionIdFromDb = await idb.get<string>('seniorSessionId');
    if (seniorSessionIdFromDb) {
        const sessions = userDocSnap.data().sessions || [];
        const seniorSessionInFirestore = sessions.find((s: Session) => s.id === seniorSessionIdFromDb && s.role === 'senior');
        if (seniorSessionInFirestore) {
            await idb.set('currentSessionId', seniorSessionInFirestore.id);
            setCurrentSessionId(seniorSessionInFirestore.id);
            await idb.set('isAuthenticated', true);
            return;
        }
    }
    
    // If not a senior re-logging in, create a new pending session
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
    await idb.set('isAuthenticated', false);
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
       sessions: [newSession],
       isManagementModeEnabled: true,
    };
    
    await setDoc(doc(db, "users", firebaseUser.uid), newUserDoc);
    
    await idb.set('currentSessionId', newSessionId);
    if(isFirstUser) {
        await idb.set('seniorSessionId', newSessionId);
        await idb.set('isAuthenticated', true);
    } else {
        await idb.set('isAuthenticated', false);
    }

    setCurrentSessionId(newSessionId);
    if (newSession.role === 'pending') {
        setLoginState('pending');
    }
  };
  
  const logout = async () => {
    if (!user || !user.currentSession) return;
    
    const sessionToLogout = user.currentSession;
    const userDocRef = doc(db, 'users', user.uid);

    if (sessionToLogout.role === 'senior') {
        await idb.set('seniorSessionId', sessionToLogout.id);
    } else {
        await updateDoc(userDocRef, { sessions: arrayRemove(sessionToLogout) });
    }
    
    await signOut(auth); // This will trigger the onAuthStateChanged listener to clean up state
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
        await updateDoc(userDocRef, { sessions: [user.currentSession] });
        await idb.del('seniorSessionId'); 
    } catch (error: any) {
        throw new Error(translateFirebaseError(error.code));
    }
  };

  const toggleManagementMode = async () => {
    if (!user || user.currentSession?.role !== 'senior') return;

    const userDocRef = doc(db, 'users', user.uid);
    const newModeState = !user.isManagementModeEnabled;

    try {
        await updateDoc(userDocRef, { isManagementModeEnabled: newModeState });
        setUser(prevUser => prevUser ? { ...prevUser, isManagementModeEnabled: newModeState } : null);
    } catch (error) {
        console.error("Failed to toggle management mode", error);
        throw error;
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
    isLoading,
    isRegistrationAllowed,
    login,
    register,
    logout,
    updateUserProfile,
    updateUserPassword,
    toggleManagementMode,
    loginState,
    setLoginState,
    approveSession,
    deleteSession,
    updateUserRole,
    translateFirebaseError,
    viewMode,
    setViewMode,
  }), [user, isLoading, isRegistrationAllowed, loginState, viewMode, translateFirebaseError]);

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
