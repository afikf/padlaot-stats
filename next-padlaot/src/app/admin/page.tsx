"use client";

import AdminGuard from '@/components/auth/AdminGuard';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import AdminGameDaysAccordion from '@/components/admin/AdminGameDaysAccordion';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import { useRouter } from 'next/navigation';
import { deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/contexts/ToastContext';

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
  const [draftGames, setDraftGames] = useState<GameNight[]>([]);
  const { players } = usePlayerStatsCache();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; gameDay: GameNight | null }>({ open: false, gameDay: null });
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchGames() {
      setLoading(true);
      // Fetch draft games
      const draftQ = query(collection(db, 'gameDays'), where('status', '==', 0), orderBy('date', 'asc'));
      const draftSnap = await getDocs(draftQ);
      setDraftGames(draftSnap.docs.map(doc => ({ ...(doc.data() as GameNight), id: doc.id })));
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

  // Handler to open delete dialog
  const requestDelete = (gameDay: GameNight) => {
    setDeleteDialog({ open: true, gameDay });
  };

  // Handler to actually delete
  const handleDelete = async () => {
    const gameDay = deleteDialog.gameDay;
    if (!gameDay) return;
    setDeleteDialog({ open: false, gameDay: null });
    try {
      await deleteDoc(doc(db, 'gameDays', gameDay.id));
      setDraftGames((prev) => prev.filter(g => g.id !== gameDay.id));
      setUpcomingGames((prev) => prev.filter(g => g.id !== gameDay.id));
      if (showToast) showToast('ערב המשחק נמחק בהצלחה', 'success');
    } catch (err) {
      if (showToast) showToast('שגיאה במחיקת ערב המשחק', 'error');
    }
  };

  // Handler to edit a game night
  const handleEdit = (gameDay: GameNight) => {
    router.push(`/admin/create-game-night?id=${gameDay.id}&step=2`); // step=2 for team assignment
  };

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
            {/* Draft Game Nights */}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
              טיוטות ערבי משחק
            </Typography>
            {draftGames.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center">
                אין טיוטות
              </Typography>
            ) : (
              <AdminGameDaysAccordion gameDays={draftGames} players={players} onEdit={handleEdit} onDelete={requestDelete} />
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
              <AdminGameDaysAccordion gameDays={upcomingGames} players={players} onEdit={handleEdit} onDelete={requestDelete} />
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
            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, gameDay: null })}>
              <DialogTitle>אישור מחיקה</DialogTitle>
              <DialogContent>
                <Typography>האם אתה בטוח שברצונך למחוק את ערב המשחק?</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteDialog({ open: false, gameDay: null })} color="primary">ביטול</Button>
                <Button onClick={handleDelete} color="error" variant="contained">מחק</Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    </AdminGuard>
  );
} 