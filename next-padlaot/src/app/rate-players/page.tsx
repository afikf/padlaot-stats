'use client';

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, MenuItem, CircularProgress, Autocomplete, FormControlLabel, Switch, Stack } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useSubscriptionsCache } from '@/hooks/useSubscriptionsCache';
import { usePlayersCache } from '@/hooks/usePlayersCache';
import { useGameNightsCache } from '@/hooks/useGameNightsCache';

interface Player {
  id: string;
  name: string;
  email?: string;
  totalGoals?: number;
  totalAssists?: number;
  totalGameNights?: number;
  totalMiniGames?: number;
  totalWins?: number;
}



export default function RatePlayersPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { showToast } = useToast();
  
  // Filter states
  const [showOnlyActivePlayers, setShowOnlyActivePlayers] = useState(false);
  const [showOnlySubscriptions, setShowOnlySubscriptions] = useState(false);
  const [showOnlyTeammates, setShowOnlyTeammates] = useState(false);
  
  // Use cache hooks instead of direct Firestore calls
  const { players } = usePlayersCache();
  const { gameNights } = useGameNightsCache();
  const { subscriptions: subsByDay } = useSubscriptionsCache();

  // Create player subscriptions map
  const playerSubscriptions = useMemo(() => {
    const subscriptions: Record<string, string> = {};
    Object.entries(subsByDay).forEach(([day, players]) => {
      players.forEach((p: any) => {
        subscriptions[p.id] = day;
      });
    });
    return subscriptions;
  }, [subsByDay]);

  // Get players who played with the current user's player
  const teammates = useMemo(() => {
    if (!userData?.playerId || !gameNights.length) return new Set<string>();
    
    const currentPlayerId = userData.playerId;
    const teammatesSet = new Set<string>();
    
    console.log('Teammates calculation:', {
      currentPlayerId,
      gameNightsCount: gameNights.length,
      gameNightsWithParticipants: gameNights.filter(gn => gn.participants && gn.participants.length > 0).length
    });
    
    // Find all game nights where the current player participated
    gameNights.forEach(gameNight => {
      // Check if this game night has participants and the current player is in it
      if (gameNight.participants && Array.isArray(gameNight.participants) && gameNight.participants.includes(currentPlayerId)) {
        console.log(`Found game night ${gameNight.id} where current player participated`);
        // Add all other participants from this game night
        gameNight.participants.forEach((participantId: string) => {
          if (participantId !== currentPlayerId) {
            teammatesSet.add(participantId);
          }
        });
      }
    });
    
    console.log('Final teammates set:', Array.from(teammatesSet));
    return teammatesSet;
  }, [userData?.playerId, gameNights]);

  // Simple filtered players without complex caching
  const filteredPlayers = useMemo(() => {
    let filtered = players;
    
    // Apply active players filter
    if (showOnlyActivePlayers) {
      filtered = filtered.filter(p => 
        (p.totalGoals && p.totalGoals > 0) ||
        (p.totalAssists && p.totalAssists > 0) ||
        (p.totalGameNights && p.totalGameNights > 0) ||
        (p.totalMiniGames && p.totalMiniGames > 0) ||
        (p.totalWins && p.totalWins > 0)
      );
    }
    
    // Apply subscriptions filter
    if (showOnlySubscriptions) {
      filtered = filtered.filter(p => playerSubscriptions[p.id]);
    }
    
    // Apply teammates filter
    if (showOnlyTeammates && userData?.playerId) {
      console.log('Applying teammates filter:', {
        teammatesCount: teammates.size,
        teammates: Array.from(teammates),
        playersBeforeFilter: filtered.length
      });
      filtered = filtered.filter(p => teammates.has(p.id));
      console.log('Players after teammates filter:', filtered.length);
    }
    
    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    }
    
    return filtered;
  }, [players, showOnlyActivePlayers, showOnlySubscriptions, showOnlyTeammates, search, playerSubscriptions, userData?.playerId, teammates]);

  // Fetch pending ranking task for current user
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, "rankingTasks"), where("userId", "==", user.uid), where("completed", "==", false));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setTask({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setTask(null);
        // Redirect to dashboard if no open assignment
        router.replace('/dashboard');
      }
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [user, router]);

  // Load existing ratings from localStorage only (much faster)
  useEffect(() => {
    if (!user) return;
    const key = `playerRatingsDraft_${user.uid}`;
    try {
      const cache = localStorage.getItem(key);
      if (cache) {
        setRatings(JSON.parse(cache));
      }
    } catch {}
  }, [user]);

  // Save ratings to localStorage on every change
  useEffect(() => {
    if (!user) return;
    const key = `playerRatingsDraft_${user.uid}`;
    try {
      localStorage.setItem(key, JSON.stringify(ratings));
    } catch {}
  }, [ratings, user]);

  // Clear localStorage cache on save/submit
  const clearRatingsCache = () => {
    if (!user) return;
    const key = `playerRatingsDraft_${user.uid}`;
    try { localStorage.removeItem(key); } catch {}
  };

  const handleRatingChange = (playerId: string, value: number) => {
    setRatings(r => ({ ...r, [playerId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !task) return;
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        Object.entries(ratings).map(([playerId, rating]) =>
          setDoc(doc(db, `playerRatings/${playerId}/ratings`, user.uid), {
            rating,
            ratedAt: serverTimestamp(),
            raterId: user.uid,
          })
        )
      );
      await setDoc(doc(db, "rankingTasks", task.id), {
        completed: true,
        completedAt: serverTimestamp(),
      }, { merge: true });
      clearRatingsCache();
      setSuccess(true);
      showToast('הדירוגים נשלחו בהצלחה!', 'success');
    } catch (err: any) {
      setError(err.message || err.toString());
      showToast('שגיאה בשליחת הדירוגים', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Save ratings without completing the task
  const handleSave = async () => {
    if (!user || !task) return;
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        Object.entries(ratings).map(([playerId, rating]) =>
          setDoc(doc(db, `playerRatings/${playerId}/ratings`, user.uid), {
            rating,
            ratedAt: serverTimestamp(),
            raterId: user.uid,
          })
        )
      );
      clearRatingsCache();
      showToast('הדירוגים נשמרו בהצלחה!', 'success');
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || err.toString());
      showToast('שגיאה בשמירת הדירוגים', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <Box sx={{ mt: 6, textAlign: 'center' }}>אנא התחבר כדי לדרג שחקנים.</Box>;
  if (loading) return <Box sx={{ mt: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ mt: 6, textAlign: 'center', color: 'red' }}>{error}</Box>;
  if (success) return <Box sx={{ mt: 6, textAlign: 'center' }}>תודה שדירגת את השחקנים!</Box>;
  if (!task) return <Box sx={{ mt: 6, textAlign: 'center' }}>אין לך משימת דירוג פתוחה.</Box>;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', py: 4, pb: 10 }}>
      <Typography variant="h5" fontWeight={700} align="center" gutterBottom>
        דרג את כל השחקנים (1-9)
      </Typography>
      
      {/* Filters Section */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          סינון שחקנים
        </Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={
              <Switch
                checked={showOnlyActivePlayers}
                onChange={(e) => setShowOnlyActivePlayers(e.target.checked)}
                color="primary"
              />
            }
            label="הצג רק שחקנים פעילים"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showOnlySubscriptions}
                onChange={(e) => setShowOnlySubscriptions(e.target.checked)}
                color="primary"
              />
            }
            label="הצג רק מנויים"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showOnlyTeammates}
                onChange={(e) => setShowOnlyTeammates(e.target.checked)}
                color="primary"
              />
            }
            label="הצג רק שחקנים שמשחקים איתי"
          />
        </Stack>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Autocomplete
          options={players}
          getOptionLabel={option => option.name || ''}
          value={selectedPlayer}
          onChange={(_, v) => {
            setSelectedPlayer(v);
            setSearch(v?.name || '');
          }}
          inputValue={search}
          onInputChange={(_, v) => setSearch(v)}
          renderInput={params => (
            <TextField {...params} label="חפש שחקן" variant="outlined" size="small" />
          )}
          sx={{ width: 300 }}
        />
      </Box>
      
      {/* Players Count Summary */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          מציג {filteredPlayers.length} מתוך {players.length} שחקנים
        </Typography>
      </Box>
      
      <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שחקן</TableCell>
              <TableCell>דירוג</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlayers.map(player => (
              <TableRow key={player.id}>
                <TableCell>{player.name || player.email || player.id}</TableCell>
                <TableCell>
                  <TextField
                    select
                    value={ratings[player.id] || ''}
                    onChange={e => handleRatingChange(player.id, Number(e.target.value))}
                    required={false}
                    disabled={submitting}
                    sx={{ width: 80 }}
                  >
                    <MenuItem value="">בחר</MenuItem>
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </TextField>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Sticky Buttons */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          bottom: 0,
          width: '100%',
          bgcolor: '#fff',
          boxShadow: '0 -4px 24px 0 #7c3aed33',
          py: 2,
          px: 2,
          zIndex: 1200,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Button
          type="button"
          variant="outlined"
          color="primary"
          sx={{ minWidth: 180, fontWeight: 700, fontSize: '1.1rem' }}
          disabled={submitting || Object.keys(ratings).length === 0}
          onClick={handleSave}
        >
          שמור דירוגים
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ minWidth: 220, fontWeight: 700, fontSize: '1.1rem' }}
          disabled={submitting || Object.keys(ratings).length === 0}
          onClick={handleSubmit}
        >
          {submitting ? "שולח..." : "שלח דירוגים"}
        </Button>
      </Box>
    </Box>
  );
} 