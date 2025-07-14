'use client';

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, onSnapshot, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, MenuItem, CircularProgress, Autocomplete } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

interface Player {
  id: string;
  name: string;
  email?: string;
}

export default function RatePlayersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { showToast } = useToast();

  // Filtered players by search
  const filteredPlayers = useMemo(() => {
    if (!search) return players;
    const q = search.toLowerCase();
    return players.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }, [players, search]);

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

  // Fetch all players
  useEffect(() => {
    async function fetchPlayers() {
      const snap = await getDocs(collection(db, "players"));
      setPlayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    }
    fetchPlayers();
  }, []);

  // Load existing ratings from Firestore and localStorage on mount
  useEffect(() => {
    if (!user) return;
    const key = `playerRatingsDraft_${user.uid}`;
    let unsub: (() => void) | undefined;
    (async () => {
      // Load from Firestore
      const snap = await getDocs(collection(db, 'players'));
      const playerIds = snap.docs.map(doc => doc.id);
      const ratingsFromDb: Record<string, number> = {};
      await Promise.all(playerIds.map(async (playerId) => {
        const ratingDoc = await getDocs(collection(db, `playerRatings/${playerId}/ratings`));
        const userRating = ratingDoc.docs.find(d => d.id === user.uid);
        if (userRating) {
          ratingsFromDb[playerId] = userRating.data().rating;
        }
      }));
      // Load from localStorage
      let ratingsFromCache: Record<string, number> = {};
      try {
        const cache = localStorage.getItem(key);
        if (cache) ratingsFromCache = JSON.parse(cache);
      } catch {}
      // Prefer the most recent (localStorage if exists, else Firestore)
      setRatings(Object.keys(ratingsFromCache).length > 0 ? ratingsFromCache : ratingsFromDb);
    })();
    // Save to localStorage on change
    return () => { if (unsub) unsub(); };
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