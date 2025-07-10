import { FirebaseError } from 'firebase/app';

interface ErrorMessage {
  en: string;
  he: string;
}

const AUTH_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  'auth/invalid-email': {
    en: 'Invalid email address',
    he: 'כתובת אימייל לא תקינה'
  },
  'auth/user-disabled': {
    en: 'This account has been disabled',
    he: 'חשבון זה הושבת'
  },
  'auth/user-not-found': {
    en: 'No account found with this email',
    he: 'לא נמצא חשבון עם אימייל זה'
  },
  'auth/wrong-password': {
    en: 'Incorrect password',
    he: 'סיסמה שגויה'
  },
  'auth/popup-closed-by-user': {
    en: 'Sign in was cancelled',
    he: 'ההתחברות בוטלה'
  },
  'auth/cancelled-popup-request': {
    en: 'Only one sign in window can be open at a time',
    he: 'ניתן לפתוח רק חלון התחברות אחד בכל פעם'
  },
  'auth/popup-blocked': {
    en: 'Sign in popup was blocked by the browser',
    he: 'חלון ההתחברות נחסם על ידי הדפדפן'
  },
  'auth/network-request-failed': {
    en: 'Network error. Please check your internet connection',
    he: 'שגיאת רשת. אנא בדוק את חיבור האינטרנט שלך'
  },
  'auth/too-many-requests': {
    en: 'Too many attempts. Please try again later',
    he: 'יותר מדי ניסיונות. אנא נסה שוב מאוחר יותר'
  },
  'auth/operation-not-allowed': {
    en: 'This sign in method is not enabled',
    he: 'שיטת התחברות זו אינה מאופשרת'
  }
};

const DEFAULT_ERROR: ErrorMessage = {
  en: 'An error occurred during sign in. Please try again',
  he: 'אירעה שגיאה במהלך ההתחברות. אנא נסה שוב'
};

export function getAuthErrorMessage(error: unknown, language: 'en' | 'he' = 'he'): string {
  if (error instanceof FirebaseError) {
    const errorCode = error.code;
    const errorMessage = AUTH_ERROR_MESSAGES[errorCode] || DEFAULT_ERROR;
    return errorMessage[language];
  }

  // Handle network errors
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('internet')) {
      return AUTH_ERROR_MESSAGES['auth/network-request-failed'][language];
    }
  }

  return DEFAULT_ERROR[language];
} 