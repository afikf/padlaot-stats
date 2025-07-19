import { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

function formatDurationMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function updateMiniGameInFirestore(tournamentId: string, miniGameId: string, updates: any) {
  const ref = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
  const updated = miniGames.map((g: any) => g.id === miniGameId ? { ...g, ...updates } : g);
  await updateDoc(ref, { miniGames: updated });
}

export default function TournamentGameTimer({ miniGame, tournamentId, onAddGoal, onEndGame }: { 
  miniGame: any, 
  tournamentId: string, 
  onAddGoal?: () => void,
  onEndGame?: () => void 
}) {
  const [isActive, setIsActive] = useState(miniGame.status === 'live');
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate elapsed time directly from database startTime
  function calculateElapsedTime(): number {
    if (!miniGame.startTime) return 0;
    
    const start = new Date(miniGame.startTime).getTime();
    const end = miniGame.endTime ? new Date(miniGame.endTime).getTime() : Date.now();
    return Math.max(0, end - start);
  }

  // Force re-render every second when active
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    setIsActive(miniGame.status === 'live');
    setIsPaused(false);
  }, [miniGame.status]);

  useEffect(() => {
    if (isActive && !isPaused && miniGame.status !== 'complete') {
      intervalRef.current = setInterval(() => {
        forceUpdate(Date.now());
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, miniGame.status]);

  async function handleStart() {
    // Only set startTime if it doesn't already exist
    if (!miniGame.startTime) {
      await updateMiniGameInFirestore(tournamentId, miniGame.id, { 
        status: 'live', 
        startTime: new Date().toISOString(), 
        endTime: null 
      });
    } else {
      // If startTime already exists, just update status to live
      await updateMiniGameInFirestore(tournamentId, miniGame.id, { 
        status: 'live', 
        endTime: null 
      });
    }
    setIsActive(true);
    setIsPaused(false);
  }

  async function handlePause() {
    setIsPaused(true);
  }

  async function handleResume() {
    setIsPaused(false);
  }

  async function handleFinish() {
    setIsActive(false);
    setIsPaused(false);
    
    if (onEndGame) {
      // Use the parent's end game function which handles draw resolution
      onEndGame();
    } else {
      // Fallback to direct database update if no parent function provided
      const now = new Date().toISOString();
      await updateMiniGameInFirestore(tournamentId, miniGame.id, { 
        status: 'complete', 
        endTime: now 
      });
    }
  }

  if (miniGame.status === 'complete') return null;

  const elapsedTime = calculateElapsedTime();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
      <Typography variant="h2" fontWeight={900} color="primary" sx={{ mb: 2, fontFamily: 'monospace' }}>
        {formatDurationMs(elapsedTime)}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Start Game button for pending mini-games */}
        {!isActive && (
          <Button variant="contained" color="success" onClick={handleStart}>
            התחל משחק
          </Button>
        )}
        {/* Add Goal button for live mini-games */}
        {isActive && onAddGoal && (
          <Button variant="contained" color="secondary" onClick={onAddGoal}>
            הוסף שער
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