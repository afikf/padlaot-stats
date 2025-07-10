'use client';

import { useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase/config';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { createUser, getUserData } from '@/lib/firebase/users';
import { useToast } from '@/contexts/ToastContext';
import { getAuthErrorMessage } from '@/lib/errors/auth-errors';
import { Container } from '@/components/ui/Container';
import { Typography } from '@/components/ui/Typography';
import { Spinner } from '@/components/ui/Spinner';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const { showToast } = useToast();

  // Check initial auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Login page - Auth state changed:', user?.email);
      
      if (user?.email) {
        try {
          // Get the ID token
          const idToken = await user.getIdToken();
          // Set the token in a cookie
          Cookies.set('idToken', idToken, { 
            expires: 7, // 7 days
            secure: true,
            sameSite: 'strict'
          });

          const userData = await getUserData(user.email);
          console.log('User data:', userData);
          
          // Redirect based on user data
          if (!userData) {
            window.location.href = '/select-player';
          } else if (!userData.playerId) {
            window.location.href = '/select-player';
          } else {
            window.location.href = '/dashboard';
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          showToast('אירעה שגיאה בטעינת נתוני המשתמש', 'error');
        }
      }
      
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [showToast]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      console.log('Starting Google login...');
      
      // Sign in with Google
      const result = await signInWithPopup(auth, googleProvider);
      const { email } = result.user;
      console.log('Google login successful:', email);

      if (!email) {
        showToast('אימייל לא נמצא בחשבון גוגל', 'error');
        return;
      }

      // Get the ID token
      const idToken = await result.user.getIdToken();
      // Set the token in a cookie
      Cookies.set('idToken', idToken, { 
        expires: 7, // 7 days
        secure: true,
        sameSite: 'strict'
      });

      // Handle user data
      const existingUser = await getUserData(email);
      console.log('User data fetched:', existingUser);
      
      if (!existingUser) {
        // Create new user
        console.log('Creating new user...');
        await createUser(email);
        showToast('ברוך הבא! נא בחר שחקן', 'success');
        window.location.href = '/select-player';
      } else if (!existingUser.playerId) {
        showToast('ברוך שובך! נא בחר שחקן', 'success');
        window.location.href = '/select-player';
      } else {
        showToast('ברוך שובך!', 'success');
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = getAuthErrorMessage(error);
      showToast(errorMessage, 'error');
      setLoading(false);
    }
  };

  // Show loading state while checking initial auth
  if (initializing) {
    return (
      <Container className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="large" className="mb-4" />
          <Typography variant="h2" className="mb-2">בודק מצב התחברות...</Typography>
        </div>
      </Container>
    );
  }

  // Show login button
  return (
    <Container className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <Typography variant="h1" className="mb-2">
              ברוכים הבאים לפדלאות
            </Typography>
            <Typography variant="base" className="text-neutral-600">
              אנא התחבר כדי להמשיך
            </Typography>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`
              w-full flex items-center justify-center gap-3
              px-6 py-4 rounded-lg
              bg-primary-600 hover:bg-primary-700
              text-white font-medium text-lg
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            `}
          >
            {loading ? (
              <>
                <Spinner size="small" className="text-white" />
                <span>מתחבר...</span>
              </>
            ) : (
              <>
                <img 
                  src="/google-icon.svg" 
                  alt="Google" 
                  className="w-6 h-6"
                />
                <span>התחבר עם גוגל</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Container>
  );
} 