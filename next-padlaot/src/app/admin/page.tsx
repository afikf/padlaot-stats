"use client";

import AdminGuard from '@/components/auth/AdminGuard';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, getDoc, writeBatch, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import AdminGameDaysAccordion from '@/components/admin/AdminGameDaysAccordion';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import { useRouter } from 'next/navigation';
import { deleteDoc } from 'firebase/firestore';
import { useToast } from '@/contexts/ToastContext';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import TournamentsAccordion from '@/components/admin/TournamentsAccordion';

dayjs.extend(utc);
dayjs.extend(timezone);

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
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    async function fetchGames() {
      setLoading(true);
      // Fetch all games
      const allQ = query(collection(db, 'gameDays'), orderBy('date', 'asc'));
      const allSnap = await getDocs(allQ);
      const allGames = allSnap.docs.map(doc => ({ ...(doc.data() as GameNight), id: doc.id }));
      // Get today in Israel time
      const todayIsrael = dayjs().tz('Asia/Jerusalem').format('YYYY-MM-DD');
      // Partition games by status and date
      let live: GameNight | null = null;
      const upcoming: GameNight[] = [];
      const draft: GameNight[] = [];
      const completed: GameNight[] = [];
      for (const game of allGames) {
        if (game.status === 0) draft.push(game);
        else if (game.status === 3) completed.push(game);
        else if (game.status === 2) live = game;
        else if (game.status === 1) {
          // If the date is today (Israel time), treat as live
          if (game.date === todayIsrael) {
            live = game;
          } else {
            upcoming.push(game);
          }
        }
      }
      setDraftGames(draft);
      setUpcomingGames(upcoming);
      setCompletedGames(completed);
      setLiveGame(live);
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
      if (gameDay.status === 3) {
        // Rollback player stats for completed game night
        const gameDayRef = doc(db, 'gameDays', gameDay.id);
        const gameDaySnap = await getDoc(gameDayRef);
        if (!gameDaySnap.exists()) throw new Error('Game night not found');
        const data = gameDaySnap.data();
        const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
        const teams = data.teams || {};
        // Collect all player IDs
        const allPlayerIds: string[] = [];
        Object.values(teams).forEach((team: any) => {
          if (Array.isArray(team.players)) {
            team.players.forEach((pid: string) => {
              if (!allPlayerIds.includes(pid)) allPlayerIds.push(pid);
            });
          }
        });
        // Prepare stat rollback per player
        const playerStats: Record<string, { goals: number; assists: number; wins: number; miniGames: number }> = {};
        allPlayerIds.forEach(playerId => {
          playerStats[playerId] = { goals: 0, assists: 0, wins: 0, miniGames: 0 };
        });
        // Count stats from miniGames
        miniGames.forEach((mini: any) => {
          if (mini.status === 'complete') {
            // Goals/assists from both possible arrays
            const allGoals = [
              ...(Array.isArray(mini.goals) ? mini.goals : []),
              ...(Array.isArray(mini.liveGoals) ? mini.liveGoals : [])
            ];
            allGoals.forEach((goal: any) => {
              if (goal.scorerId && playerStats[goal.scorerId]) playerStats[goal.scorerId].goals++;
              if (goal.assistId && playerStats[goal.assistId]) playerStats[goal.assistId].assists++;
            });
            // Wins
            Object.keys(teams).forEach(teamKey => {
              const team = teams[teamKey];
              if (team && Array.isArray(team.players)) {
                const isWinner = (mini.teamA === teamKey && mini.scoreA > mini.scoreB) || (mini.teamB === teamKey && mini.scoreB > mini.scoreA);
                if (isWinner) {
                  team.players.forEach((pid: string) => {
                    if (playerStats[pid]) playerStats[pid].wins++;
                  });
                }
              }
            });
            // Mini-games played
            Object.values(teams).forEach((team: any) => {
              if (team && Array.isArray(team.players)) {
                team.players.forEach((pid: string) => {
                  if (playerStats[pid]) playerStats[pid].miniGames++;
                });
              }
            });
          }
        });
        // Batch update all players
        const batch = writeBatch(db);
        for (const playerId of allPlayerIds) {
          const playerRef = doc(db, 'players', playerId);
          const playerSnap = await getDoc(playerRef);
          if (playerSnap.exists()) {
            const pdata = playerSnap.data();
            batch.update(playerRef, {
              totalGoals: Math.max(0, (pdata.totalGoals || 0) - playerStats[playerId].goals),
              totalAssists: Math.max(0, (pdata.totalAssists || 0) - playerStats[playerId].assists),
              totalWins: Math.max(0, (pdata.totalWins || 0) - playerStats[playerId].wins),
              totalMiniGames: Math.max(0, (pdata.totalMiniGames || 0) - playerStats[playerId].miniGames),
              totalGameNights: Math.max(0, (pdata.totalGameNights || 0) - 1)
            });
          }
        }
        // Delete the game night
        batch.delete(gameDayRef);
        await batch.commit();
        setCompletedGames((prev) => prev.filter(g => g.id !== gameDay.id));
        if (showToast) showToast('ערב המשחק הושלם ונמחק בהצלחה, הסטטיסטיקות עודכנו', 'success');
        return;
      }
      // Not completed: just delete
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
    if (gameDay.status === 3) {
      // Completed game: go to mini-games management in edit mode
      router.push(`/admin/live/${gameDay.id}?editCompleted=true`);
    } else {
      // Draft/upcoming: go to create/edit wizard
      router.push(`/admin/create-game-night?id=${gameDay.id}&step=2`);
    }
  };

  // Handler to make a game live
  const handleMakeLive = async (gameDay: GameNight) => {
    try {
      await updateDoc(doc(db, 'gameDays', gameDay.id), { status: 2 });
      setUpcomingGames(prev => prev.filter(g => g.id !== gameDay.id));
      setLiveGame(gameDay);
      if (showToast) showToast('המשחק הועבר לסטטוס חי', 'success');
    } catch (err) {
      if (showToast) showToast('שגיאה בהעברת המשחק לסטטוס חי', 'error');
    }
  };

  // Tournament handlers
  const handleEditTournament = (tournament: any) => {
    router.push(`/admin/tournaments/create?id=${tournament.id}&step=2&edit=1`);
  };
  const handleDeleteTournament = async (tournament: any) => {
    await deleteDoc(doc(db, 'tournaments', tournament.id));
    setTournaments(prev => prev.filter(t => t.id !== tournament.id));
  };
  const handleMakeLiveTournament = async (tournament: any) => {
    await updateDoc(doc(db, 'tournaments', tournament.id), { status: 2 });
    setTournaments(prev => prev.map(t => t.id === tournament.id ? { ...t, status: 2 } : t));
  };

  // Fetch tournaments
  useEffect(() => {
    async function fetchTournaments() {
      try {
        const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
        setTournaments(tournamentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        // handle error or leave tournaments empty
      }
    }
    fetchTournaments();
  }, []);

  // Find live tournament
  const liveTournament = tournaments.find(t => t.status === 2);
  const otherTournaments = tournaments.filter(t => t.status !== 2);

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
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2, fontWeight: 900, fontSize: '1.1rem', px: 4, py: 1.5 }}
                    fullWidth
                    onClick={() => router.push(`/admin/live/${liveGame.id}`)}
                  >
                    נהל משחק חי
                  </Button>
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
              <AdminGameDaysAccordion gameDays={upcomingGames} players={players} onEdit={handleEdit} onDelete={requestDelete} onMakeLive={handleMakeLive} />
            )}
            {/* Tournaments section below upcoming games */}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
              טורנירים
            </Typography>
            {/* Live Tournament Card */}
            {liveTournament && (
              <Card sx={{ mb: 3, border: '2px solid #7c3aed', boxShadow: 4, bgcolor: '#f3e8ff' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={900} color="secondary" gutterBottom>
                    טורניר חי עכשיו
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {liveTournament.date}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2, fontWeight: 900, fontSize: '1.1rem', px: 4, py: 1.5 }}
                    fullWidth
                    onClick={() => router.push(`/tournaments/${liveTournament.id}/live`)}
                  >
                    נהל טורניר חי
                  </Button>
                </CardContent>
              </Card>
            )}
            <TournamentsAccordion
              tournaments={otherTournaments}
              onEdit={handleEditTournament}
              onDelete={handleDeleteTournament}
              onMakeLive={handleMakeLiveTournament}
            />
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
                <AdminGameDaysAccordion
                  gameDays={completedGames}
                  players={players}
                  onEdit={handleEdit}
                  onDelete={requestDelete}
                />
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