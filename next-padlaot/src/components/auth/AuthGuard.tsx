// AuthGuard: Generic, reusable authentication and authorization guard
// Usage: Wrap any protected page/component with <AuthGuard>
// Props:
//   - requireAuth: boolean (default true)
//   - requirePlayerLink: boolean (default false)
//   - requiredRole: string | undefined (e.g., 'admin')
//
// The guard will check for authentication, player linkage, and role as specified.
// Shows a loading spinner while checking, and redirects or shows error if not authorized.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requirePlayerLink?: boolean;
  requiredRole?: string;
}

export default function AuthGuard({
  children,
  requireAuth = true,
  requirePlayerLink = false,
  requiredRole,
}: AuthGuardProps) {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    // Debug logging
    console.log('AuthGuard debug:', { user, userData, playerId: userData?.playerId });
    // 1. Check authentication
    if (requireAuth && !user) {
      router.replace('/login');
      return;
    }
    // 2. Check player linkage
    if (requirePlayerLink && (!userData || !userData.playerId)) {
      router.replace('/link-player');
      return;
    }
    // 3. Check required role
    if (requiredRole) {
      if (!userData || userData.role !== requiredRole) {
        setError('אין לך הרשאות מתאימות לעמוד זה.');
        return;
      }
    }
    setError(null);
  }, [user, userData, loading, requireAuth, requirePlayerLink, requiredRole, router]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
      </Box>
    );
  }

  // All checks passed
  return <>{children}</>;
} 