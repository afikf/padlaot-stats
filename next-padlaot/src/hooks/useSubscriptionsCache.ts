'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export function useSubscriptionsCache() {
  const [subscriptions, setSubscriptions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribes: (() => void)[] = [];
    let loaded = 0;
    DAYS.forEach(day => {
      const ref = collection(db, 'subscriptions');
      const unsubscribe = onSnapshot(ref, (snapshot: QuerySnapshot<DocumentData>) => {
        const dayDoc = snapshot.docs.find(doc => doc.id === day);
        setSubscriptions(prev => ({
          ...prev,
          [day]: dayDoc?.data()?.players || []
        }));
        loaded++;
        if (loaded === DAYS.length) setLoading(false);
      }, (err) => {
        setError(err.message);
        setLoading(false);
      });
      unsubscribes.push(unsubscribe);
    });
    return () => { unsubscribes.forEach(unsub => unsub()); };
  }, []);

  return { subscriptions, loading, error };
} 