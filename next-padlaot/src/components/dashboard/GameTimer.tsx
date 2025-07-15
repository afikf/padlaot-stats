import { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

function formatDurationMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function updateMiniGameInFirestore(gameDayId: string, miniGameId: string, updates: any) {
  const ref = doc(db, 'gameDays', gameDayId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
  const updated = miniGames.map((g: any) => g.id === miniGameId ? { ...g, ...updates } : g);
  await updateDoc(ref, { miniGames: updated });
}

export default function GameTimer({ miniGame, gameDayId }: { miniGame: any, gameDayId: string }) {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(miniGame.status === 'live');
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate initial time from startTime/endTime
  useEffect(() => {
    if (miniGame.startTime) {
      const start = new Date(miniGame.startTime).getTime();
      const end = miniGame.endTime ? new Date(miniGame.endTime).getTime() : Date.now();
      setTime(end - start);
      setStartTime(start);
      setPausedAt(null);
    } else {
      setTime(0);
      setStartTime(null);
      setPausedAt(null);
    }
    setIsActive(miniGame.status === 'live');
    setIsPaused(false);
  }, [miniGame.startTime, miniGame.endTime, miniGame.status]);

  // Timer logic
  useEffect(() => {
    if (isActive && !isPaused && miniGame.status !== 'complete') {
      if (!startTime) setStartTime(Date.now() - time); // resume from paused time or start fresh
      intervalRef.current = setInterval(() => {
        setTime(Date.now() - (startTime ?? Date.now()));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPaused, miniGame.status, startTime]);

  async function handleStart() {
    setIsActive(true);
    setIsPaused(false);
    const now = new Date().toISOString();
    setStartTime(Date.now());
    setTime(0);
    await updateMiniGameInFirestore(gameDayId, miniGame.id, { status: 'live', startTime: now, endTime: null });
  }

  async function handlePause() {
    setIsPaused(true);
    setPausedAt(Date.now());
  }

  async function handleResume() {
    setIsPaused(false);
    if (pausedAt && startTime) {
      // Adjust startTime so timer resumes correctly
      setStartTime(startTime + (Date.now() - pausedAt));
      setPausedAt(null);
    }
  }

  async function handleFinish() {
    setIsActive(false);
    setIsPaused(false);
    const now = new Date().toISOString();
    await updateMiniGameInFirestore(gameDayId, miniGame.id, { status: 'complete', endTime: now });
  }

  if (miniGame.status === 'complete') return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
      <Typography variant="h2" fontWeight={900} color="primary" sx={{ mb: 2, fontFamily: 'monospace' }}>
        {formatDurationMs(time)}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {!isActive && (
          <Button variant="contained" color="success" onClick={handleStart}>
            התחל משחק
          </Button>
        )}
        {isActive && !isPaused && (
          <Button variant="outlined" color="warning" onClick={handlePause}>
            השהה
          </Button>
        )}
        {isActive && isPaused && (
          <Button variant="contained" color="primary" onClick={handleResume}>
            המשך
          </Button>
        )}
        {isActive && (
          <Button variant="contained" color="error" onClick={handleFinish}>
            סיים משחק
          </Button>
        )}
      </Box>
    </Box>
  );
} 