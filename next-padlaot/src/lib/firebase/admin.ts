import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
const app = !getApps().length 
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

interface AdminData {
  email: string;
  createdAt: string;
  lastLoginAt: string;
}

export async function isAdmin(email: string): Promise<boolean> {
  if (!email) return false;
  
  try {
    const adminDoc = getFirestore(app).collection('admins').doc(email);
    const adminSnap = await adminDoc.get();
    return adminSnap.exists;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function createAdmin(email: string) {
  try {
    const adminDoc = getFirestore(app).collection('admins').doc(email);
    const now = new Date().toISOString();
    
    const adminData: AdminData = {
      email,
      createdAt: now,
      lastLoginAt: now
    };
    
    await adminDoc.set(adminData);
    console.log('✅ Admin record created successfully');
  } catch (error) {
    console.error('Error creating admin record:', error);
    throw error;
  }
}

export async function updateAdminLastLogin(email: string) {
  try {
    const adminDoc = getFirestore(app).collection('admins').doc(email);
    await adminDoc.update({
      lastLoginAt: new Date().toISOString()
    });
    console.log('✅ Admin last login updated');
  } catch (error) {
    console.error('Error updating admin last login:', error);
    throw error;
  }
} 