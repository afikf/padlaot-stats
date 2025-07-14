import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, auth } from './config';

export interface UserData {
  uid: string;
  email: string;
  role: 'super-admin' | 'admin' | 'user';
  playerId?: string;
  playerName?: string;
  createdAt: number;
  updatedAt: number;
}

export async function getUserData(uid: string): Promise<UserData | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return null;
    }
    return userDoc.data() as UserData;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
}

export async function connectUserToPlayer(uid: string, playerId: string, playerName: string): Promise<void> {
  try {
    // Check if player is already connected to another user
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('playerId', '==', playerId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error('Player is already connected to another user');
    }
    // Get current user data
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    const userData = userDoc.data() as UserData;
    // Update user data with player info
    await setDoc(doc(db, 'users', uid), {
      ...userData,
      playerId: playerId === null ? '' : playerId,
      playerName: playerName === null ? '' : playerName,
      updatedAt: Date.now()
    });
    // Update player doc with userId
    const playerDocRef = doc(db, 'players', playerId);
    const playerDoc = await getDoc(playerDocRef);
    if (playerDoc.exists()) {
      await setDoc(playerDocRef, { ...playerDoc.data(), userId: uid }, { merge: true });
    }
  } catch (error) {
    console.error('Error connecting user to player:', error);
    throw error;
  }
}

export async function createUser(uid: string, email: string | null | undefined, role: UserData['role'] = 'user'): Promise<void> {
  try {
    const now = Date.now();
    const userData: any = {
      uid,
      email: email || '',
      role,
      createdAt: now,
      updatedAt: now
    };
    // Do not include playerId or playerName if not set
    await setDoc(doc(db, 'users', uid), userData);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUserRole(uid: string, role: UserData['role']): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    const userData = userDoc.data() as UserData;
    await setDoc(doc(db, 'users', uid), {
      ...userData,
      role,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<UserData[]> {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
} 