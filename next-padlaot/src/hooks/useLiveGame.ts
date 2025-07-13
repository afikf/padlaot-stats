import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function useLiveGame(gameId: string) {
  const [gameDay, setGameDay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    const ref = doc(db, 'gameDays', gameId);
    const unsub = onSnapshot(ref,
      (snap) => {
        if (snap.exists()) {
          setGameDay({ ...snap.data(), id: snap.id });
          setError(null);
        } else {
          setGameDay(null);
          setError(new Error('Game not found'));
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [gameId]);

  return { gameDay, loading, error };
} 