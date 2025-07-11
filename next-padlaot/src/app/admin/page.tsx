"use client";

import AdminGuard from '@/components/auth/AdminGuard';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import AdminGameDaysAccordion from '@/components/admin/AdminGameDaysAccordion';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';

interface GameNight {
  id: string;
  date: string;
  status: number; // 2 = live, 1 = upcoming, 3 = completed
  teams?: any;
  [key: string]: any;
}

export default function AdminPage() {
  const [liveGame, setLiveGame] = useState<GameNight | null>(null);
  const [upcomingGames, setUpcomingGames] = useState<GameNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedGames, setCompletedGames] = useState<GameNight[]>([]);
  const { players } = usePlayerStatsCache();

  useEffect(() => {
    async function fetchGames() {
      setLoading(true);
      // Fetch live game
      const liveQ = query(collection(db, 'gameDays'), where('status', '==', 2));
      const liveSnap = await getDocs(liveQ);
      setLiveGame(liveSnap.empty ? null : { ...(liveSnap.docs[0].data() as GameNight), id: liveSnap.docs[0].id });
      // Fetch upcoming games
      const upcomingQ = query(collection(db, 'gameDays'), where('status', '==', 1), orderBy('date', 'asc'));
      const upcomingSnap = await getDocs(upcomingQ);
      setUpcomingGames(upcomingSnap.docs.map(doc => ({ ...(doc.data() as GameNight), id: doc.id })));
      // Fetch completed games (only if needed)
      if (showCompleted) {
        const completedQ = query(collection(db, 'gameDays'), where('status', '==', 3), orderBy('date', 'desc'));
        const completedSnap = await getDocs(completedQ);
        setCompletedGames(completedSnap.docs.map(doc => ({ ...(doc.data() as GameNight), id: doc.id })));
      }
      setLoading(false);
    }
    fetchGames();
  }, [showCompleted]);

  return (
    <AdminGuard>
      <Box sx={{ maxWidth: 700, mx: 'auto', py: 4 }}>
        <Typography variant="h4" color="primary" fontWeight={900} gutterBottom align="center">
          דשבורד ניהול משחקים
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Live Game Night */}
            {liveGame ? (
              <Card sx={{ mb: 3, border: '2px solid #7c3aed', boxShadow: 4, bgcolor: '#f3e8ff' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={900} color="secondary" gutterBottom>
                    משחק חי עכשיו
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {liveGame.date} {/* Format as needed */}
                  </Typography>
                  {/* Add more live game details here */}
                </CardContent>
              </Card>
            ) : (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
                אין כרגע משחק חי
              </Typography>
            )}
            {/* Upcoming Game Nights */}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
              משחקים קרובים
            </Typography>
            {upcomingGames.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center">
                אין משחקים קרובים
              </Typography>
            ) : (
              <Stack spacing={2}>
                {upcomingGames.map(game => (
                  <Card key={game.id} sx={{ px: 2 }}>
                    <CardContent>
                      <Typography variant="body1" fontWeight={700}>{game.date}</Typography>
                      {/* Add more upcoming game details here */}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
            {/* Completed Games Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button variant="outlined" color="secondary" onClick={() => setShowCompleted(v => !v)}>
                {showCompleted ? 'הסתר משחקים שהושלמו' : 'הצג משחקים שהושלמו'}
              </Button>
            </Box>
            {/* Completed Games List */}
            {showCompleted && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  משחקים שהושלמו
                </Typography>
                <AdminGameDaysAccordion gameDays={completedGames} players={players} />
              </Box>
            )}
          </>
        )}
      </Box>
    </AdminGuard>
  );
} 