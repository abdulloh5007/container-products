
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as FirebaseAuthUser, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, getDocs, collection, query, onSnapshot, arrayUnion, arrayRemove, Timestamp, writeBatch, limit } from 'firebase/firestore';
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

export type LoginState = 'form' | 'pending' | 'failed' | 'no_account' | 'access_denied' | 'approved';

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
  requestWorkerAccess: () => Promise<void>;
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

let seniorUserUnsubscribe: (() => void) | null = null;

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
    if (typeof window !== 'undefined') {
      idb.set('viewMode', mode);
    }
  };
  
  useEffect(() => {
    const loadPersistedData = async () => {
      if (typeof window !== 'undefined') {
        const storedViewMode = await idb.get<ViewMode>('viewMode');
        if (storedViewMode === 'classic' || storedViewMode === 'modern') {
          setViewModeState(storedViewMode);
        }
        const storedLang = await idb.get<any>('language');
        if (storedLang && (storedLang === 'ru' || storedLang === 'uz')) {
            setLanguage(storedLang);
        }
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
            const snapshot = await getDocs(query(usersCollectionRef, limit(1)));
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
        if (typeof window !== 'undefined') {
            const sessionId = await idb.get<string>('currentSessionId');
            setCurrentSessionId(sessionId || null);
        }
        // No need to set a placeholder user state here, let the onAuthStateChanged handle it.
    };
    initializeSession();
  }, []);

  const listenForSeniorUserChanges = useCallback((pendingSessionId: string) => {
    if (seniorUserUnsubscribe) seniorUserUnsubscribe();

    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, limit(1));
    
    seniorUserUnsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) return;
      
      const seniorUserDoc = snapshot.docs[0];
      const sessions = seniorUserDoc.data().sessions as Session[];
      const mySession = sessions.find(s => s.id === pendingSessionId);
      
      if (mySession) {
        if (mySession.role !== 'pending') {
          // Approved! Worker/Junior does not need to sign in.
          // The session ID is their key.
          await idb.set('currentSessionId', mySession.id);
          await idb.set('isAuthenticated', true); 
          await idb.del('pendingSessionId');
          setLoginState('approved');
          if (seniorUserUnsubscribe) seniorUserUnsubscribe();
          
          // Reload to re-trigger the auth flow with the new session.
          window.location.reload();

        }
      } else {
        // Declined (session was removed)
        setLoginState('access_denied');
        await idb.del('pendingSessionId');
        if (seniorUserUnsubscribe) seniorUserUnsubscribe();
      }
    }, (error) => {
        console.error("Error listening to senior user changes: ", error);
        if (seniorUserUnsubscribe) seniorUserUnsubscribe();
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const mainAuthLogic = async () => {
        const localIsAuthenticated = await idb.get<boolean>('isAuthenticated');
        const localCurrentSessionId = await idb.get<string>('currentSessionId');

        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                 const userDocRef = doc(db, "users", firebaseUser.uid);
                 const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists() && localCurrentSessionId) {
                        const userData = docSnap.data() as Omit<AppUser, 'currentSession'>;
                        const sessions = userData.sessions || [];
                        const currentSession = sessions.find(s => s.id === localCurrentSessionId) || null;
                        
                        if (currentSession) {
                            const appUser = { ...userData, uid: firebaseUser.uid, currentSession };
                            setUser(appUser);
                        } else {
                           // This session was deleted remotely, sign out.
                           logout();
                        }
                    } else {
                       // User doc doesn't exist or no session, sign out.
                       logout();
                    }
                    setIsLoading(false);
                });
                return () => unsubscribeUser();
            } else {
                // No Firebase user. Could be a worker or junior.
                if (localIsAuthenticated && localCurrentSessionId) {
                    // This is a worker/junior. We need to fetch the senior user doc to find their session.
                    const usersQuery = query(collection(db, 'users'), limit(1));
                    const unsubscribeSenior = onSnapshot(usersQuery, (snapshot) => {
                         if (!snapshot.empty) {
                            const seniorUserDoc = snapshot.docs[0];
                            const seniorUserData = seniorUserDoc.data() as AppUser;
                            const currentSession = seniorUserData.sessions.find(s => s.id === localCurrentSessionId);

                            if (currentSession) {
                                setUser({
                                    ...seniorUserData,
                                    uid: seniorUserDoc.id, // The UID is the senior's
                                    currentSession: currentSession,
                                });
                            } else {
                                // Session not found, clear local state
                                logout();
                            }
                        } else {
                             // No senior user found, can't be authenticated.
                            logout();
                        }
                        setIsLoading(false);
                    });
                    return () => unsubscribeSenior();
                } else {
                    const pendingId = await idb.get<string>('pendingSessionId');
                    if (pendingId) {
                        setLoginState('pending');
                        listenForSeniorUserChanges(pendingId);
                    } else {
                         setUser(null);
                         idb.del('currentSessionId');
                         idb.del('isAuthenticated');
                         setLoginState('form');
                    }
                    setIsLoading(false);
                }
            }
        });
    }
    
    if (typeof window !== 'undefined') {
        mainAuthLogic();
    }

    return () => {
        if (seniorUserUnsubscribe) seniorUserUnsubscribe();
    };
  }, [listenForSeniorUserChanges]);
  
  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password).catch(error => {
      throw new Error(translateFirebaseError(error.code));
    });
  
    const firebaseUser = userCredential.user;
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
  
    if (!userDocSnap.exists()) {
      await signOut(auth);
      throw new Error(translateFirebaseError('auth/invalid-credential'));
    }

    const newSessionId = generateSessionId();
    const newSession: Session = {
        id: newSessionId,
        deviceName: getDeviceName(),
        name: userDocSnap.data().name,
        role: 'senior',
        createdAt: Timestamp.now()
    }
    
    await updateDoc(userDocRef, { sessions: arrayUnion(newSession) });
  
    await idb.set('currentSessionId', newSessionId);
    await idb.set('isAuthenticated', true);
    setCurrentSessionId(newSessionId);
  };

  const requestWorkerAccess = async () => {
    if (seniorUserUnsubscribe) seniorUserUnsubscribe();

    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        throw new Error("No senior user found to send request to.");
    }
    const seniorUserDoc = snapshot.docs[0];
    const seniorUserRef = seniorUserDoc.ref;
    
    const deviceName = getDeviceName();
    
    const newSessionId = generateSessionId();
    const newSession: Session = {
        id: newSessionId,
        deviceName: deviceName,
        role: 'pending',
        createdAt: Timestamp.now()
    }

    await updateDoc(seniorUserRef, {
        sessions: arrayUnion(newSession)
    });
    
    await idb.set('pendingSessionId', newSessionId);
    setLoginState('pending');
    listenForSeniorUserChanges(newSessionId);
  };
  
  const register = async (name: string, email: string, password: string) => {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        throw new Error("Registration is not allowed. A senior user already exists.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password).catch(error => {
      throw new Error(translateFirebaseError(error.code));
    });
    
    const firebaseUser = userCredential.user;

    const newSessionId = generateSessionId();
    const newSession: Session = {
        id: newSessionId,
        deviceName: getDeviceName(),
        name: name,
        role: 'senior', // First registered user is always senior
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
    await idb.set('isAuthenticated', true);
    setCurrentSessionId(newSessionId);
  };
  
  const logout = async () => {
    if (!user || !user.currentSession) return;
  
    const currentSession = user.currentSession;
    const userDocRef = doc(db, 'users', user.uid);
  
    const sessionToRemove = user.sessions.find(s => s.id === currentSession.id);
    if (sessionToRemove) {
      try {
        await updateDoc(userDocRef, { sessions: arrayRemove(sessionToRemove) });
      } catch (e) {
        console.error("Failed to remove session on logout, maybe document was deleted.", e);
      }
    }
  
    const redirectPath = currentSession.role === 'senior' ? '/admin/login' : '/admin/loginAsWorker';
  
    if (auth.currentUser && auth.currentUser.uid === user.uid) {
      await signOut(auth);
    }
  
    await idb.del('currentSessionId');
    await idb.del('isAuthenticated');
    setUser(null);
    setCurrentSessionId(null);
    setLoginState('form');
  
    window.location.href = redirectPath;
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
        const batch = writeBatch(db);
        // Remove all other sessions
        user.sessions.forEach(session => {
            if (session.id !== user.currentSession!.id) {
                batch.update(userDocRef, { sessions: arrayRemove(session) });
            }
        });
        await batch.commit();
        
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
    requestWorkerAccess,
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
  }), [user, isLoading, isRegistrationAllowed, loginState, viewMode, translateFirebaseError, listenForSeniorUserChanges]);

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
