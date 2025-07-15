import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
let app: any = null;
let auth: any = null;
let db: any = null;

// Only initialize if we're not in build mode and have the required environment variables
if (process.env.NODE_ENV !== 'production' || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)) {
  try {
    app = !getApps().length 
      ? initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          })
        })
      : getApp();
    
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    // During build time, environment variables might not be available
    console.warn('Firebase Admin initialization failed (this is normal during build):', error);
  }
}

export { auth, db };

interface AdminData {
  email: string;
  createdAt: string;
  lastLoginAt: string;
}

export async function isAdmin(email: string): Promise<boolean> {
  if (!email) return false;
  
  try {
    const adminDoc = db?.collection('admins').doc(email);
    const adminSnap = await adminDoc?.get();
    return adminSnap?.exists || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function createAdmin(email: string) {
  try {
    const adminDoc = db?.collection('admins').doc(email);
    const now = new Date().toISOString();
    
    const adminData: AdminData = {
      email,
      createdAt: now,
      lastLoginAt: now
    };
    
    await adminDoc?.set(adminData);
    console.log('✅ Admin record created successfully');
  } catch (error) {
    console.error('Error creating admin record:', error);
    throw error;
  }
}

export async function updateAdminLastLogin(email: string) {
  try {
    const adminDoc = db?.collection('admins').doc(email);
    await adminDoc?.update({
      lastLoginAt: new Date().toISOString()
    });
    console.log('✅ Admin last login updated');
  } catch (error) {
    console.error('Error updating admin last login:', error);
    throw error;
  }
} 