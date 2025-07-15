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

          // Use UID for user data lookup
          const userData = await getUserData(user.uid);
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
      const { email, uid } = result.user;
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

      // Use UID for user data lookup
      const existingUser = await getUserData(uid);
      console.log('User data fetched:', existingUser);
      
      if (!existingUser) {
        // Create new user with UID
        console.log('Creating new user...');
        await createUser(uid, email);
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
    <Container className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-6">
            <img 
              src="/logo.jpeg" 
              alt="פדלאות לוגו" 
              className="mx-auto mb-4 rounded-lg shadow-md object-cover"
              style={{ 
                width: '300px', 
                height: '300px',
                objectFit: 'cover'
              }}
            />
            <Typography variant="h1" className="mb-2 text-2xl sm:text-3xl">
              ברוכים הבאים לפדלאות
            </Typography>
            <Typography variant="base" className="text-neutral-600 text-sm sm:text-base">
              אנא התחבר כדי להמשיך
            </Typography>
          </div>

                      <div className="flex justify-center">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px 32px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  minWidth: '280px'
                }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)';
              target.style.transform = 'scale(1.02)';
              target.style.boxShadow = '0 15px 35px rgba(139, 92, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)';
              target.style.transform = 'scale(1)';
              target.style.boxShadow = '0 10px 25px rgba(139, 92, 246, 0.3)';
            }}
          >
            {loading ? (
              <>
                <Spinner size="small" className="text-white" />
                <span>מתחבר...</span>
              </>
            ) : (
                              <>
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <img 
                      src="/google-icon.svg" 
                      alt="Google" 
                      className="w-4 h-4"
                    />
                  </div>
                  <span>התחבר עם Google</span>
                </>
                            )}
              </button>
            </div>
        </div>
      </div>
    </Container>
  );
} 