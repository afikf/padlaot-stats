'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserData, type UserData, createUser } from '@/lib/firebase/users';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  logout: async () => {},
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Handle auth state changes
  useEffect(() => {
    console.log('Setting up auth state listener');
    let isSubscribed = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', { email: user?.email, uid: user?.uid });
      
      if (!isSubscribed) {
        console.log('Subscription cancelled, ignoring update');
        return;
      }

      try {
        if (user?.uid) {
          // Get user data by UID
          let data = await getUserData(user.uid);
          if (!data) {
            // User doc does not exist, create it
            await createUser(user.uid, user.email || '');
            data = await getUserData(user.uid);
          }
          if (isSubscribed) {
            setUser(user);
            setUserData(data);
            console.log('Fetched userData:', data);
          }
        } else {
          if (isSubscribed) {
            setUser(null);
            setUserData(null);
            console.log('No user, cleared state');
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (isSubscribed) {
          setUser(null);
          setUserData(null);
          showToast('אירעה שגיאה בטעינת נתוני המשתמש', 'error');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    });

    return () => {
      console.log('Cleaning up auth state listener');
      isSubscribed = false;
      unsubscribe();
    };
  }, [showToast]);

  // Add refreshUserData to allow manual reload of userData
  const refreshUserData = async () => {
    if (user?.uid) {
      const data = await getUserData(user.uid);
      setUserData(data);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    console.log('Handling logout');
    await signOut(auth);
    window.location.href = '/login';
  };

  const value = {
    user,
    userData,
    loading,
    logout: handleLogout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 