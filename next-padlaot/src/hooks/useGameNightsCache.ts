'use client';
// useGameNightsCache: hook for fetching, caching, and subscribing to game nights data

import { useEffect, useState } from 'react';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface GameNight {
  id: string;
  date: string;
  participants?: string[];
  miniGames: any[];
  [key: string]: any;
}

export function useGameNightsCache() {
  const [gameNights, setGameNights] = useState<GameNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const ref = collection(db, 'gameDays');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGameNights(data as GameNight[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { gameNights, loading, error };
} 