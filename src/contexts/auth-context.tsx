
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

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password:string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<AppUser>) => void;
  updateUserProfile: (data: {Name: string, phone: string, password?: string}) => Promise<void>;
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
                           // Ensure local data is up-to-date with Firestore
                           const updatedUser: AppUser = {
                               ...storedUser,
                               Name: userDocSnap.data().Name,
                               phone: userDocSnap.data().phone,
                               password: userDocSnap.data().password, // Ensure password is set from DB
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

  const login = async (phone: string, password: string): Promise<boolean> => {
    const userId = phone.replace(/\D/g, '');
    if (!userId || !password) return false;
    
    setIsLoading(true);
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        const newSession: Session = {
            sessionToken: generateSessionToken(),
            deviceName: getDeviceName(),
            date: new Date().toISOString(),
            role: 'pending' // Default to pending
        };

        if (userDocSnap.exists()) { // Existing user login
            if (userDocSnap.data().password !== password) return false;

            const userData = userDocSnap.data();
            const sessions: Session[] = userData.sessionTokens || [];
            
            const seniorExists = sessions.some(s => s.role === 'senior');
            if (!seniorExists) { // No senior admin, this login becomes senior
                newSession.role = 'senior';
            }

            await updateDoc(userDocRef, {
                sessionTokens: arrayUnion(newSession),
                lastLogin: serverTimestamp(),
            });
            
             if (newSession.role === 'pending') {
                // Don't log in yet, wait for senior approval
                return true; // Indicate success to show pending message
            }
            
            const appUser: AppUser = {
                phone: userData.phone,
                Name: userData.Name,
                password: userData.password,
                currentSession: newSession,
            };

            setUser(appUser);
            localStorage.setItem('user', JSON.stringify(appUser));
            return true;

        } else { // First-ever login for this system
            const usersQuery = await getDocs(collection(db, 'users'));
            if (usersQuery.empty) { // This is the very first user
                newSession.role = 'senior';
                
                const newUserAccount = {
                    phone: `+${userId}`,
                    password: password,
                    Name: 'Admin', // Default name
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
                return true;
            }
            return false; // No existing user and it's not the first-ever user
        }
    } catch (error) {
        console.error("Firestore error during login:", error);
        return false;
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
        
        // Atomically remove the session object from the array
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

    // Also update the session in the local state
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
  }), [user, isLoading]);

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
