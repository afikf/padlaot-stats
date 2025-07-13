"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { AdminContextType, AdminUser, UserRole } from '@/types/admin';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdminRole() {
      console.log('[AdminContext] useEffect: user:', user, 'userData:', userData);
      if (!user || !userData) {
        setAdminUser(null);
        setLoading(false);
        console.log('[AdminContext] No user or userData, adminUser set to null');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get user document from Firestore to check role
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role || 'user';
          console.log('[AdminContext] Firestore user role:', role);
          if (role === 'admin' || role === 'super-admin') {
            const adminUserObj = {
              id: user.uid,
              email: user.email || '',
              role: role as UserRole,
              playerId: userData.playerId,
            };
            setAdminUser(adminUserObj);
            console.log('[AdminContext] Set adminUser:', adminUserObj);
          } else {
            setAdminUser(null);
            console.log('[AdminContext] Role not admin/super-admin, adminUser set to null');
          }
        } else {
          setAdminUser(null);
          console.log('[AdminContext] No userDoc, adminUser set to null');
        }
      } catch (err) {
        console.error('Error checking admin role:', err);
        setError('Failed to check admin permissions');
        setAdminUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAdminRole();
  }, [user, userData]);

  const value: AdminContextType = {
    isAdmin: adminUser?.role === 'admin' || adminUser?.role === 'super-admin',
    isSuperAdmin: adminUser?.role === 'super-admin',
    adminUser,
    loading,
    error,
  };
  console.log('[AdminContext] value:', value);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
} 