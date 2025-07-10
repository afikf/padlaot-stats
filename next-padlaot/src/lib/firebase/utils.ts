import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  runTransaction,
  type QueryConstraint,
  type DocumentData
} from 'firebase/firestore';
import { db } from './config';

export const firestore = {
  // Collection operations
  getCollection: (path: string) => collection(db, path),
  
  // Document operations
  getDoc: async (path: string) => {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  setDoc: async (path: string, data: DocumentData) => {
    const docRef = doc(db, path);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  },

  updateDoc: async (path: string, data: Partial<DocumentData>) => {
    const docRef = doc(db, path);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  },

  deleteDoc: async (path: string) => {
    const docRef = doc(db, path);
    await deleteDoc(docRef);
  },

  // Query operations
  query: (path: string, ...queryConstraints: QueryConstraint[]) => {
    return query(collection(db, path), ...queryConstraints);
  },

  // Batch operations
  createBatch: () => writeBatch(db),

  // Transaction operations
  runTransaction: (updateFunction: any) => runTransaction(db, updateFunction),

  // Realtime listeners
  onSnapshot: (path: string, callback: (data: any) => void) => {
    const docRef = doc(db, path);
    return onSnapshot(docRef, (doc) => {
      callback(doc.exists() ? { id: doc.id, ...doc.data() } : null);
    });
  },

  // Helper functions
  serverTimestamp: () => serverTimestamp(),
  timestamp: Timestamp,
  where,
  orderBy,
  limit
}; 