
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, getDocs, collection, query, onSnapshot, Timestamp, writeBatch, limit, deleteDoc, where } from 'firebase/firestore';
import { translations } from '@/lib/translations';
import { useRouter } from 'next/navigation';
import * as idb from '@/lib/indexed-db';


export type UserRole = 'senior' | 'junior' | 'worker';

export interface AppUser {
    uid: string;
    name: string;
    email?: string;
    phone?: string;
    userRole: UserRole;
    deviceName: string;
    createdAt: Timestamp;
    isManagementModeEnabled?: boolean;
}

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRegistrationAllowed: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithQrToken: (token: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { name: string, phone: string }) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, data: { name: string, userRole: 'junior' | 'worker' }) => Promise<void>;
  translateFirebaseError: (errorCode: string) => string;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [language, setLanguage] = useState<keyof typeof translations>('ru');
  const router = useRouter();
  
  useEffect(() => {
    const loadPersistedData = async () => {
      if (typeof window !== 'undefined') {
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
            const seniorQuery = query(collection(db, 'users'), where('userRole', '==', 'senior'), limit(1));
            const snapshot = await getDocs(seniorQuery);
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
        const handleAuth = async () => {
            setIsLoading(true);
            const localUserId = await idb.get<string>('userId');

            if (!localUserId) {
                setUser(null);
                setIsLoading(false);
                return () => {};
            }
            
            const userDocRef = doc(db, 'users', localUserId);
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
                } else {
                    logout();
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error with user subscription:", error);
                logout();
                setIsLoading(false);
            });

            return () => unsubscribe();
        };

        handleAuth();
    }, []);
  
  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password).catch(error => {
      throw new Error(translateFirebaseError(error.code));
    });
  
    const firebaseUser = userCredential.user;
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
  
    if (!userDocSnap.exists() || userDocSnap.data()?.userRole !== 'senior') {
      await signOut(auth);
      throw new Error(translateFirebaseError('auth/invalid-credential'));
    }

    await idb.set('userId', firebaseUser.uid);
    setUser({ uid: firebaseUser.uid, ...userDocSnap.data() } as AppUser);
  };

  const loginWithQrToken = async (tokenId: string) => {
    const tokenDocRef = doc(db, 'qr_login_tokens', tokenId);
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (!tokenDocSnap.exists()) {
        throw new Error(translations[language].admin_qr_invalid_code);
    }
    
    const tokenData = tokenDocSnap.data();

    if (tokenData.used || tokenData.expiresAt.toMillis() < Date.now()) {
        throw new Error(translations[language].admin_qr_invalid_code);
    }

    const deviceName = getDeviceName();
    const newUserDocRef = doc(collection(db, 'users'));

    const newUser: Omit<AppUser, 'uid'> = {
        name: `${tokenData.role === 'junior' ? 'Помощник' : 'Работник'} - ${deviceName.split(' ')[0]}`,
        userRole: tokenData.role,
        deviceName: deviceName,
        createdAt: Timestamp.now(),
    }
    
    const batch = writeBatch(db);
    batch.set(newUserDocRef, newUser);
    batch.update(tokenDocRef, { used: true, usedAt: Timestamp.now(), usedByDevice: deviceName, usedByUserId: newUserDocRef.id });
    await batch.commit();
    
    await idb.set('userId', newUserDocRef.id);
    setUser({ uid: newUserDocRef.id, ...newUser } as AppUser);
  }
  
  const register = async (name: string, email: string, password: string) => {
    const seniorQuery = query(collection(db, 'users'), where('userRole', '==', 'senior'), limit(1));
    const snapshot = await getDocs(seniorQuery);

    if (!snapshot.empty) {
        throw new Error("Registration is not allowed. A senior user already exists.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password).catch(error => {
      throw new Error(translateFirebaseError(error.code));
    });
    
    const firebaseUser = userCredential.user;

    const newUserDoc: Omit<AppUser, 'uid'> = {
       name: name,
       email: firebaseUser.email,
       userRole: 'senior',
       deviceName: getDeviceName(),
       createdAt: Timestamp.now(),
       isManagementModeEnabled: true,
    };
    
    const userDocRef = doc(db, "users", firebaseUser.uid);
    await setDoc(userDocRef, newUserDoc);
    await idb.set('userId', firebaseUser.uid);
    
    const settingsDocRef = doc(db, 'settings', 'main');
    await setDoc(settingsDocRef, { name, phone: '' }, { merge: true });
  };
  
  const logout = async () => {
    if (auth.currentUser) {
        await signOut(auth);
    }
    await idb.del('userId');
    setUser(null);
    router.push('/admin/login');
  };

  const updateUserProfile = async (data: { name: string, phone: string }) => {
    if (!user || user.userRole !== 'senior') throw new Error("User not authenticated or not a senior.");
    const settingsDocRef = doc(db, 'settings', 'main');
    await setDoc(settingsDocRef, { name: data.name, phone: data.phone }, { merge: true });
  };

  const updateUserPassword = async (newPassword: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || user?.userRole !== 'senior') {
        throw new Error(translateFirebaseError('auth/user-not-found'));
    }
    try {
        await updatePassword(firebaseUser, newPassword);
    } catch (error: any) {
        throw new Error(translateFirebaseError(error.code));
    }
  };
  
  const deleteUser = async (userId: string) => {
    if (!user || user.userRole !== 'senior') throw new Error("Permission denied.");
    await deleteDoc(doc(db, "users", userId));
  }
  
  const updateUser = async (userId: string, data: { name: string, userRole: 'junior' | 'worker' }) => {
    if (!user || user.userRole !== 'senior') throw new Error("Permission denied.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
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
    deleteUser,
    updateUser,
    translateFirebaseError,
  }), [user, isLoading, isRegistrationAllowed, translateFirebaseError]);

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
