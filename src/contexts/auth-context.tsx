
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, User as FirebaseAuthUser, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, getDocs, collection, query, onSnapshot, arrayUnion, arrayRemove, Timestamp, writeBatch, limit } from 'firebase/firestore';
import { translations } from '@/lib/translations';
import { useRouter } from 'next/navigation';
import * as idb from '@/lib/indexed-db';


export type SessionRole = 'senior' | 'junior' | 'worker';
export type ViewMode = 'classic' | 'modern';

export interface Session {
    id: string; 
    name: string;
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

export type LoginState = 'form' | 'approved';

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
  loginWithQrToken: (token: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { name: string, phone: string }) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
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
        setIsLoading(true);
        const handleAuth = async () => {
            const localSession = await idb.get<Session>('currentSession');

            const unsubs: (()=>void)[] = [];

            if (localSession?.role === 'senior') {
                const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                    if (firebaseUser) {
                        const userDocRef = doc(db, 'users', firebaseUser.uid);
                        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
                            if (docSnap.exists()) {
                                const userData = docSnap.data() as Omit<AppUser, 'uid'|'currentSession'>;
                                const sessions = userData.sessions || [];
                                const currentSession = sessions.find(s => s.id === localSession.id) || null;
                                if (currentSession) {
                                    setUser({ ...userData, uid: firebaseUser.uid, currentSession });
                                } else {
                                    logout(true);
                                }
                            } else {
                                logout();
                            }
                        });
                        unsubs.push(unsubUser);
                    } else {
                        logout();
                    }
                    setIsLoading(false);
                });
                unsubs.push(unsubscribe);
            } else if (localSession && (localSession.role === 'junior' || localSession.role === 'worker')) {
                const usersQuery = query(collection(db, 'users'), limit(1));
                const unsubscribeSenior = onSnapshot(usersQuery, (snapshot) => {
                    if (!snapshot.empty) {
                        const seniorUserDoc = snapshot.docs[0];
                        const seniorUserData = seniorUserDoc.data() as AppUser;
                        const currentSession = seniorUserData.sessions.find(s => s.id === localSession.id);

                        if (currentSession) {
                            setUser({ ...seniorUserData, uid: seniorUserDoc.id, currentSession });
                        } else {
                            logout(true);
                        }
                    } else {
                        logout();
                    }
                     setIsLoading(false);
                });
                unsubs.push(unsubscribeSenior);
            } else {
                setUser(null);
                await idb.del('currentSession');
                setLoginState('form');
                setIsLoading(false);
            }

            return () => {
                unsubs.forEach(unsub => unsub());
            }
        };

        handleAuth();

    }, [router]);
  
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

    const userData = userDocSnap.data();
    const newSessionId = generateSessionId();
    const newSession: Session = {
        id: newSessionId,
        deviceName: getDeviceName(),
        name: userData.name,
        role: 'senior',
        createdAt: Timestamp.now()
    }
    
    await updateDoc(userDocRef, { sessions: arrayUnion(newSession) });
  
    await idb.set('currentSession', newSession);
    
    const updatedSessions = [...(userData.sessions || []), newSession];
    setUser({
      ...userData,
      uid: firebaseUser.uid,
      sessions: updatedSessions,
      currentSession: newSession,
    } as AppUser);
  };

  const loginWithQrToken = async (tokenId: string) => {
    const tokenDocRef = doc(db, 'qr_login_tokens', tokenId);
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (!tokenDocSnap.exists()) {
        throw new Error("Недействительный или неверный QR-код.");
    }
    const tokenData = tokenDocSnap.data();
    if (tokenData.used) {
        throw new Error("Этот QR-код уже был использован.");
    }
    if (tokenData.expiresAt.toMillis() < Date.now()) {
        throw new Error("Срок действия этого QR-кода истек.");
    }

    const usersQuery = query(collection(db, 'users'), limit(1));
    const seniorUserSnapshot = await getDocs(usersQuery);
    if (seniorUserSnapshot.empty) {
        throw new Error("Не найден аккаунт администратора для входа.");
    }
    const seniorUserDocRef = seniorUserSnapshot.docs[0].ref;
    const deviceName = getDeviceName();

    const newSession: Session = {
        id: generateSessionId(),
        deviceName: deviceName,
        name: `${tokenData.role === 'junior' ? 'Помощник' : 'Работник'} - ${deviceName.split(' ')[0]}`,
        role: tokenData.role,
        createdAt: Timestamp.now(),
    }
    
    const batch = writeBatch(db);
    batch.update(seniorUserDocRef, { sessions: arrayUnion(newSession) });
    batch.update(tokenDocRef, { used: true, usedAt: Timestamp.now(), usedByDevice: deviceName });
    await batch.commit();
    
    await idb.set('currentSession', newSession);
    
    // Manually set user state to trigger redirect
    const seniorData = seniorUserSnapshot.docs[0].data() as AppUser;
    setUser({
        ...seniorData,
        uid: seniorUserDocRef.id,
        currentSession: newSession
    });
  }
  
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
    
    await idb.set('currentSession', newSession);
  };
  
  const logout = async (isRemoteDeletion: boolean = false) => {
    const localSession = await idb.get<Session>('currentSession');
    if (!localSession) {
         if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
            window.location.href = '/admin/login';
         }
        return;
    }
  
    if (!isRemoteDeletion) {
        const isSeniorUser = localSession.role === 'senior';
        if (isSeniorUser && auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            try {
                await updateDoc(userDocRef, { sessions: arrayRemove(localSession) });
            } catch (e) {
                console.error("Failed to remove session on logout, maybe document was deleted.", e);
            }
            await signOut(auth);
        } else if (!isSeniorUser) {
            const usersQuery = query(collection(db, 'users'), limit(1));
            const seniorUserSnapshot = await getDocs(usersQuery);
            if (!seniorUserSnapshot.empty) {
                const seniorUserDocRef = seniorUserSnapshot.docs[0].ref;
                 try {
                    await updateDoc(seniorUserDocRef, { sessions: arrayRemove(localSession) });
                } catch (e) {
                    console.error("Failed to remove session on logout.", e);
                }
            }
        }
    }
    
    await idb.del('currentSession');
    setUser(null);
    setLoginState('form');
  
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
      window.location.href = '/admin/login';
    }
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
    isAuthenticated: !!user,
    isLoading,
    isRegistrationAllowed,
    login,
    loginWithQrToken,
    register,
    logout,
    updateUserProfile,
    updateUserPassword,
    toggleManagementMode,
    loginState,
    setLoginState,
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
