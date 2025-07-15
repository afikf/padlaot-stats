"use client";

import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

interface AdminGuardProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export default function AdminGuard({ children, requireSuperAdmin = false }: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: adminLoading, error } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }

      if (requireSuperAdmin && !isSuperAdmin) {
        router.push('/admin');
        return;
      }
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, adminLoading, requireSuperAdmin, router]);

  // Show loading while checking permissions
  if (authLoading || adminLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error if admin check failed
  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <Typography color="error" variant="h6">
          שגיאה בבדיקת הרשאות מנהל
        </Typography>
        <Typography color="text.secondary">
          {error}
        </Typography>
        <Button variant="contained" onClick={() => router.push('/dashboard')}>
          חזרה לדשבורד
        </Button>
      </Box>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return null; // Will redirect to login
  }

  // Check if user is admin
  if (!isAdmin) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <Typography variant="h6" color="error">
          אין לך הרשאות מנהל
        </Typography>
        <Typography color="text.secondary">
          רק מנהלים יכולים לגשת לעמוד זה
        </Typography>
        <Button variant="contained" onClick={() => router.push('/dashboard')}>
          חזרה לדשבורד
        </Button>
      </Box>
    );
  }

  // Check if super admin is required
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <Typography variant="h6" color="error">
          נדרשים הרשאות מנהל עליון
        </Typography>
        <Typography color="text.secondary">
          רק מנהלים עליונים יכולים לגשת לעמוד זה
        </Typography>
        <Button variant="contained" onClick={() => router.push('/admin')}>
          חזרה לפאנל המנהל
        </Button>
      </Box>
    );
  }

  // User has required permissions
  return <>{children}</>;
} 