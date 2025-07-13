
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as FirebaseAuthUser, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser, updateEmail } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, getDocs, collection, query, where, onSnapshot, arrayUnion, arrayRemove, Timestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import UAParser from 'ua-parser-js';
import Cookies from 'js-cookie';
import { translations } from '@/lib/translations';

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
  setLoginState: (state: LoginState) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { name: string, phone: string }) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  setPendingRequests: (count: number) => void;
  toggleManagementMode: () => Promise<void>;
  approveSession: (session: Session) => Promise<void>;
  deleteSession: (session: Session) => Promise<void>;
  makeSenior: (session: Session) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
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
    try {
        const parser = new UAParser();
        const result = parser.getResult();
        
        const browser = result.browser.name || 'Browser';
        const os = result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'OS';
        
        if (result.device.vendor && result.device.model) {
            return `${result.device.vendor} ${result.device.model} (${os})`;
        }
        if (result.device.type) {
             return `${result.device.type} (${os})`;
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
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isManagementModeEnabled, setIsManagementModeEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loginState, setLoginState] = useState<LoginState>('form');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<keyof typeof translations>('ru');


  useEffect(() => {
    const lsSessionId = localStorage.getItem('sessionId');
    const cookieSessionId = Cookies.get('sessionId');
    let sessionId = lsSessionId || cookieSessionId || null;

    if (sessionId) {
      if (!lsSessionId) localStorage.setItem('sessionId', sessionId);
      if (!cookieSessionId) Cookies.set('sessionId', sessionId, { expires: 365 });
      setCurrentSessionId(sessionId);
    }

    const storedLang = localStorage.getItem('language');
    if (storedLang && (storedLang === 'ru' || storedLang === 'uz')) {
        setLanguage(storedLang);
    }
  }, []);

  const translateFirebaseError = useCallback((errorCode: string): string => {
        const errorKey = `firebase_error_${errorCode.replace(/[^a-z0-9-]/g, '_')}` as keyof typeof translations.ru;
        const fallbackKey = 'firebase_error_unknown' as keyof typeof translations.ru;
        return translations[language][errorKey] || translations[language][fallbackKey];
  }, [language]);
  
  const forceLocalLogout = useCallback(async (denied: boolean = false) => {
    await signOut(auth);
    localStorage.removeItem('sessionId');
    Cookies.remove('sessionId');
    setCurrentSessionId(null);
    setUser(null);
    setLoginState(denied ? 'access_denied' : 'form');
  }, []);
  
  // Effect to check if registration should be allowed
  useEffect(() => {
    const checkUsers = async () => {
        setIsAuthLoading(true);
        try {
            const usersCollectionRef = collection(db, 'users');
            const snapshot = await getDocs(query(usersCollectionRef));
            setIsRegistrationAllowed(snapshot.empty);
        } catch (error) {
            console.error("Error checking for users:", error);
            setIsRegistrationAllowed(false); // Default to not allowed on error
        } finally {
            setIsAuthLoading(false);
        }
    };
    checkUsers();
  }, [])

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
                    localSessionId = localStorage.getItem('sessionId') || Cookies.get('sessionId') || null;
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
                       if (localSessionId) {
                           forceLocalLogout(true);
                        } else {
                           setIsAuthLoading(false);
                        }
                    }
                } else {
                   forceLocalLogout();
                }
                if(isAuthLoading) setIsAuthLoading(false);
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
  }, [currentSessionId, forceLocalLogout, isAuthLoading]);
  
  const login = async (email: string, password: string) => {
    setLoginState('form');
    let firebaseUser;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
    } catch(error: any) {
        throw new Error(translateFirebaseError(error.code));
    }

    if (!firebaseUser) throw new Error(translateFirebaseError('auth/user-not-found'));

    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        setLoginState('no_account');
        await signOut(auth);
        throw new Error(translateFirebaseError('auth/user-not-found'));
    }
    
    const existingSessions = userDocSnap.data().sessions || [];
    const hasSenior = existingSessions.some((s: Session) => s.role === 'senior');

    const newSessionId = generateSessionId();
    const newSession: Session = {
        id: newSessionId,
        deviceName: getDeviceName(),
        role: hasSenior ? 'pending' : 'senior',
        createdAt: Timestamp.now()
    }
    
    await updateDoc(userDocRef, {
        sessions: arrayUnion(newSession)
    });
    
    localStorage.setItem('sessionId', newSessionId);
    Cookies.set('sessionId', newSessionId, { expires: 365 });
    setCurrentSessionId(newSessionId);
    
    if (newSession.role === 'pending') {
        setLoginState('pending');
    }
  };
  
  const register = async (name: string, email: string, password: string) => {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef);
    const snapshot = await getDocs(q);

    if (!snapshot.empty && !isRegistrationAllowed) {
        throw new Error("Registration is not allowed.");
    }

    let isFirstUser = snapshot.empty;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

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
        
        if (isFirstUser) {
            setIsRegistrationAllowed(false);
        }
        await signOut(auth);

    } catch(error: any) {
        throw new Error(translateFirebaseError(error.code));
    }
  };
  
  const logout = async () => {
    const firebaseUser = auth.currentUser;
    const localSessionId = currentSessionId;
    if (!firebaseUser || !user || !localSessionId) {
      // If something is wrong, just perform a local logout
      await forceLocalLogout();
      return;
    }

    const userDocRef = doc(db, 'users', firebaseUser.uid);

    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const sessionList = (docSnap.data().sessions || []) as Session[];
        const loggingOutSession = sessionList.find(s => s.id === localSessionId);

        if (loggingOutSession) {
          let updatedSessions = sessionList.filter(s => s.id !== localSessionId);

          if (loggingOutSession.role === 'senior' && !updatedSessions.some(s => s.role === 'senior')) {
            const juniorSessions = updatedSessions
              .filter(s => s.role === 'junior')
              .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

            if (juniorSessions.length > 0) {
              const nextSeniorId = juniorSessions[0].id;
              updatedSessions = updatedSessions.map(s =>
                s.id === nextSeniorId ? { ...s, role: 'senior' } : s
              );
            }
          }
          await updateDoc(userDocRef, { sessions: updatedSessions });
        }
      }
    } catch (error) {
      console.error("Error updating sessions on logout:", error);
      // Even if Firestore update fails, proceed to log the user out locally
    } finally {
      // This part now happens AFTER database operations.
      await signOut(auth);
      localStorage.removeItem('sessionId');
      Cookies.remove('sessionId');
      setCurrentSessionId(null);
      setUser(null);
    }
  };


  const updateUserProfile = async (data: { name: string, phone: string }) => {
    if (!user) throw new Error("User not authenticated");
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("User not authenticated");

    const userDocRef = doc(db, 'users', user.uid);
    
    await updateDoc(userDocRef, {
        name: data.name,
        phone: data.phone,
    });
  };

  const updateUserPassword = async (newPassword: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !user?.currentSession) {
        throw new Error(translateFirebaseError('auth/user-not-found'));
    }
    try {
        await updatePassword(firebaseUser, newPassword);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        await updateDoc(userDocRef, {
            sessions: [user.currentSession]
        });

    } catch (error: any) {
        throw new Error(translateFirebaseError(error.code));
    }
  };
  
  const deleteUserAccount = async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !user || user.currentSession?.role !== 'senior') {
          throw new Error(translateFirebaseError('auth/operation-not-allowed'));
      }

      try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await deleteDoc(userDocRef);
          await deleteUser(firebaseUser);
          await forceLocalLogout();
      } catch (error: any) {
          throw new Error(translateFirebaseError(error.code));
      }
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
    isRegistrationAllowed,
    login,
    register,
    logout,
    updateUserProfile,
    updateUserPassword,
    deleteUserAccount,
    pendingRequests,
    setPendingRequests,
    isManagementModeEnabled,
    isLoadingSettings,
    toggleManagementMode,
    loginState,
    setLoginState,
    approveSession,
    deleteSession,
    makeSenior,
    translateFirebaseError,
  }), [user, isAuthLoading, isRegistrationAllowed, login, register, logout, updateUserProfile, updateUserPassword, deleteUserAccount, pendingRequests, isManagementModeEnabled, isLoadingSettings, toggleManagementMode, loginState, approveSession, deleteSession, makeSenior, translateFirebaseError]);

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
