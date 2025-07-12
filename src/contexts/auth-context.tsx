
'use client';

import { createContext, useState, ReactNode, useContext, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, setDoc, getDocs, collection } from 'firebase/firestore';

export interface Session {
    role: 'senior' | 'junior' | 'pending';
    sessionToken: string;
    deviceName: string;
    date: string; // ISO 8601 format
}

interface AppUser {
    phone: string;
    Name: string;
    password?: string;
    currentSession: Session;
}

type LoginResult = {
  success: boolean;
  isPending?: boolean;
  session?: Session;
}

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingRequests: number;
  setPendingRequests: (count: number) => void;
  login: (phone: string, password:string) => Promise<LoginResult>;
  logout: () => void;
  updateUser: (data: Partial<AppUser>) => void;
  updateUserProfile: (data: {Name: string, phone: string, password?: string}) => Promise<void>;
  manuallySetUser: (user: AppUser) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateSessionToken = () => {
    return [...Array(30)].map(() => Math.random().toString(36)[2]).join('');
}

const getDeviceName = () => {
    if (typeof window === 'undefined') return 'Unknown Device';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Mobile Phone";
    if (ua.includes('Mac')) return "Mac";
    if (ua.includes('Windows')) return "Windows PC";
    return "Desktop";
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    const validateSession = async () => {
        try {
            const storedUserString = localStorage.getItem('user');
            if (storedUserString) {
                const storedUser: AppUser = JSON.parse(storedUserString);
                
                if (storedUser.phone && storedUser.currentSession?.sessionToken) {
                    const userId = storedUser.phone.replace(/\D/g, '');
                    const userDocRef = doc(db, 'users', userId);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const sessions = userDocSnap.data().sessionTokens as Session[] || [];
                        const currentSession = sessions.find(s => s.sessionToken === storedUser.currentSession.sessionToken);
                        
                        if (currentSession && currentSession.role !== 'pending') {
                           const updatedUser: AppUser = {
                               ...storedUser,
                               Name: userDocSnap.data().Name,
                               phone: userDocSnap.data().phone,
                               password: userDocSnap.data().password,
                               currentSession: currentSession
                           }
                           setUser(updatedUser);
                           localStorage.setItem('user', JSON.stringify(updatedUser));
                        } else {
                           localStorage.removeItem('user');
                           setUser(null);
                        }
                    } else {
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

  const login = async (phone: string, password: string): Promise<LoginResult> => {
    const userId = phone.replace(/\D/g, '');
    if (!userId || !password) return { success: false };
    
    setIsLoading(true);
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        const newSession: Session = {
            sessionToken: generateSessionToken(),
            deviceName: getDeviceName(),
            date: new Date().toISOString(),
            role: 'pending'
        };

        if (userDocSnap.exists()) { // Existing user login
            if (userDocSnap.data().password !== password) return { success: false };

            const userData = userDocSnap.data();
            const sessions: Session[] = userData.sessionTokens || [];
            
            const seniorExists = sessions.some(s => s.role === 'senior');
            if (!seniorExists) {
                newSession.role = 'senior';
            }

            await updateDoc(userDocRef, {
                sessionTokens: arrayUnion(newSession),
                lastLogin: serverTimestamp(),
            });
            
             if (newSession.role === 'pending') {
                return { success: true, isPending: true, session: newSession };
            }
            
            const appUser: AppUser = {
                phone: userData.phone,
                Name: userData.Name,
                password: userData.password,
                currentSession: newSession,
            };

            setUser(appUser);
            localStorage.setItem('user', JSON.stringify(appUser));
            return { success: true, isPending: false };

        } else { // First-ever login
            const usersQuery = await getDocs(collection(db, 'users'));
            if (usersQuery.empty) {
                newSession.role = 'senior';
                
                const newUserAccount = {
                    phone: `+${userId}`,
                    password: password,
                    Name: 'Admin',
                    sessionTokens: [newSession],
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                };
                await setDoc(userDocRef, newUserAccount);
                
                const appUser: AppUser = {
                    phone: `+${userId}`,
                    Name: 'Admin',
                    password: password,
                    currentSession: newSession
                };

                setUser(appUser);
                localStorage.setItem('user', JSON.stringify(appUser));
                return { success: true, isPending: false };
            }
            return { success: false };
        }
    } catch (error) {
        console.error("Firestore error during login:", error);
        return { success: false };
    } finally {
        setIsLoading(false);
    }
  };
  
  const logout = async () => {
    const currentUser = user;
    if (!currentUser || !currentUser.currentSession) return;
    
    setIsLoading(true);
    try {
        const userId = currentUser.phone.replace(/\D/g, '');
        const userDocRef = doc(db, 'users', userId);
        
        await updateDoc(userDocRef, {
            sessionTokens: arrayRemove(currentUser.currentSession)
        });
        
    } catch (error) {
        console.error("Error clearing session token from Firestore", error);
    } finally {
        setUser(null);
        localStorage.removeItem('user');
        setIsLoading(false);
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
  
  const manuallySetUser = (userToSet: AppUser) => {
    setUser(userToSet);
    localStorage.setItem('user', JSON.stringify(userToSet));
  };


  const updateUserProfile = async (data: { Name: string, phone: string, password?: string }) => {
    if (!user) {
        throw new Error("User not authenticated");
    }

    const currentUserId = user.phone.replace(/\D/g, '');
    const userDocRef = doc(db, 'users', currentUserId);

    const updateData: any = {
        Name: data.Name,
        phone: data.phone,
    };
    if (data.password) {
        updateData.password = data.password;
    }

    await updateDoc(userDocRef, updateData);

    updateUser({ Name: data.Name, phone: data.phone, password: data.password });
  };


  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    updateUserProfile,
    pendingRequests,
    setPendingRequests,
    manuallySetUser,
  }), [user, isLoading, pendingRequests]);

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
