'use client';

import { Box, Card, CardContent, CardHeader, Typography, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Chip, TextField, Tooltip, IconButton } from '@mui/material';
import { Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSubscriptionsCache } from '@/hooks/useSubscriptionsCache';
import { usePlayersCache } from '@/hooks/usePlayersCache';
import { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';

const DAYS = [
  { key: 'Sunday', label: 'ראשון' },
  { key: 'Monday', label: 'שני' },
  { key: 'Tuesday', label: 'שלישי' },
  { key: 'Wednesday', label: 'רביעי' },
  { key: 'Thursday', label: 'חמישי' },
];

export default function SubscriptionsAdminPage() {
  const { subscriptions, loading: loadingSubs } = useSubscriptionsCache();
  const { players, loading: loadingPlayers } = usePlayersCache();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDay, setDialogDay] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<any[]>([]);
  const { showToast } = useToast ? useToast() : { showToast: undefined };
  const [saving, setSaving] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteDay, setPendingDeleteDay] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pendingCreateDay, setPendingCreateDay] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dateConflictDialogOpen, setDateConflictDialogOpen] = useState(false);
  const [conflictingDate, setConflictingDate] = useState<string | null>(null);
  const router = useRouter();

  // Open dialog for add/edit
  const handleOpenDialog = (dayKey: string, currentPlayers: any[]) => {
    setDialogDay(dayKey);
    setSelectedPlayers(currentPlayers);
    setDialogOpen(true);
  };
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogDay(null);
    setSelectedPlayers([]);
  };
  // Players already subscribed to other days (except current)
  const subscribedPlayerIds = Object.entries(subscriptions)
    .filter(([day]) => day !== dialogDay)
    .flatMap(([_, players]) => players.map((p: any) => p.id));

  const handleSaveDialog = async () => {
    if (!dialogDay || selectedPlayers.length !== 21) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'subscriptions', dialogDay), {
        players: selectedPlayers.map(p => ({ id: p.id, name: p.name }))
      });
      showToast && showToast('המנויים נשמרו בהצלחה', 'success');
      handleCloseDialog();
    } catch (err) {
      showToast && showToast('שגיאה בשמירת המנויים', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubscription = async () => {
    if (!pendingDeleteDay) return;
    try {
      await deleteDoc(doc(db, 'subscriptions', pendingDeleteDay));
      showToast && showToast('המנויים נמחקו בהצלחה', 'success');
    } catch (err) {
      showToast && showToast('שגיאה במחיקת המנויים', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setPendingDeleteDay(null);
    }
  };

  const getNextDateForDay = (dayKey: string) => {
    // Israeli time (UTC+3, no DST handling for simplicity)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetIdx = weekDays.indexOf(dayKey);
    const todayIdx = today.getDay();
    let diff = targetIdx - todayIdx;
    if (diff < 0) diff += 7;
    // If today is the target day, use today
    if (diff === 0) return today;
    // Otherwise, add diff days
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff);
    return nextDate;
  };

  // Check if date already has a game (including drafts)
  const checkDateConflict = async (selectedDate: string): Promise<boolean> => {
    try {
      const gameDaysRef = collection(db, 'gameDays');
      const q = query(gameDaysRef, where('date', '==', selectedDate));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking date conflict:', error);
      return false;
    }
  };

  const handleCreateGameNight = async () => {
    if (!pendingCreateDay) return;
    setCreating(true);
    try {
      const dateObj = getNextDateForDay(pendingCreateDay);
      const dateStr = dateObj.toISOString().split('T')[0];
      
      // Check for date conflict before creating
      const hasConflict = await checkDateConflict(dateStr);
      if (hasConflict) {
        setConflictingDate(dateStr);
        setDateConflictDialogOpen(true);
        setCreateDialogOpen(false);
        setPendingCreateDay(null);
        setCreating(false);
        return;
      }
      
      // Find the 21 players for this day
      const players = subscriptions[pendingCreateDay] || [];
      // Create game night doc (adjust collection/path as needed)
      const docRef = await setDoc(doc(db, 'gameDays', `${pendingCreateDay}_${dateStr}`), {
        date: dateStr,
        participants: players.map(p => p.id),
        teams: { A: { players: [] }, B: { players: [] }, C: { players: [] } },
        status: 'draft',
        createdAt: new Date(),
        fromSubscription: true,
        subscriptionDay: pendingCreateDay
      });
      showToast && showToast('ערב משחק נוצר בהצלחה', 'success');
      setCreateDialogOpen(false);
      setPendingCreateDay(null);
      // Redirect to admin page, step 3 (adjust route as needed)
      router.push(`/admin/create-game-night?id=${pendingCreateDay}_${dateStr}&step=3`);
    } catch (err) {
      showToast && showToast('שגיאה ביצירת ערב משחק', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDateConflictClose = () => {
    setDateConflictDialogOpen(false);
    setConflictingDate(null);
  };

  if (loadingSubs || loadingPlayers) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight={900} color="primary" align="center" gutterBottom>
        ניהול מנויים לימי השבוע
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-start',
          mb: 4,
        }}
      >
        {DAYS.map(day => {
          const dayPlayers = subscriptions[day.key] || [];
          const isFull = dayPlayers.length === 21;
          return (
            <Card
              key={day.key}
              sx={{
                minWidth: 320,
                maxWidth: 340,
                minHeight: 340,
                aspectRatio: '1/1',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 3,
                position: 'relative',
                m: 2,
                flex: '0 1 320px',
              }}
            >
              <Typography align="center" fontWeight={700} fontSize={22} sx={{ width: '100%', textAlign: 'center', pt: 2, pb: 0 }}>
                {day.label}
              </Typography>
              <CardContent sx={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 0 }}>
                {isFull ? (
                  (() => {
                    const mid = Math.ceil(dayPlayers.length / 2);
                    const col1 = dayPlayers.slice(0, mid);
                    const col2 = dayPlayers.slice(mid);
                    const allPlayers = [];
                    for (let i = 0; i < mid; i++) {
                      allPlayers.push(col1[i] || null);
                      allPlayers.push(col2[i] || null);
                    }
                    return (
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mx: 'auto', width: 'fit-content', maxWidth: '100%', maxHeight: 200, overflowY: 'auto', direction: 'rtl',
                        pl: 2,
                        '&::-webkit-scrollbar': { width: 1 },
                        '&::-webkit-scrollbar-thumb': { backgroundColor: '#b4b4b4', borderRadius: 4 },
                        scrollbarWidth: 'thin',
                      }}>
                        {allPlayers.map((p, idx) => (
                          p ? (
                            <Typography key={p.id || idx} sx={{ fontSize: 15, py: 0.5, wordBreak: 'break-word', textAlign: 'right', justifySelf: 'end' }}>{p.name || p.id}</Typography>
                          ) : <div key={idx} />
                        ))}
                      </Box>
                    );
                  })()
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 2, px: 3, py: 1.5, fontWeight: 700, fontSize: 16 }}
                      onClick={() => handleOpenDialog(day.key, dayPlayers)}>
                      הוסף 21 שחקנים
                    </Button>
                    <Typography color="text.secondary" align="center" sx={{ mt: 2, fontSize: 15 }}>
                      אין עדיין 21 שחקנים ליום זה
                    </Typography>
                  </Box>
                )}
              </CardContent>
              {isFull && (
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 1, pb: 1.5, pt: 1, mt: 'auto' }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    size="small"
                    sx={{ minWidth: 70, maxWidth: 90, px: 1.5, borderRadius: 2 }}
                    onClick={() => handleOpenDialog(day.key, dayPlayers)}
                  >
                    ערוך
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    size="small"
                    sx={{ minWidth: 70, maxWidth: 90, px: 1.5, borderRadius: 2 }}
                    onClick={() => { setPendingDeleteDay(day.key); setDeleteDialogOpen(true); }}
                  >
                    מחק
                  </Button>
                  <Tooltip title="צור ערב משחק חדש" arrow>
                    <IconButton
                      color="primary"
                      size="large"
                      sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: '50%' }}
                      onClick={() => { setPendingCreateDay(day.key); setCreateDialogOpen(true); }}
                    >
                      <AddIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Card>
          );
        })}
      </Box>
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>בחר 21 שחקנים ליום {DAYS.find(d => d.key === dialogDay)?.label}</DialogTitle>
        <DialogContent>
          <Typography align="center" sx={{ mb: 2, fontWeight: 700, fontSize: 18 }}>
            נבחרו {selectedPlayers.length} מתוך 21
          </Typography>
          <Autocomplete
            multiple
            options={players}
            getOptionLabel={option => option.name || ''}
            value={selectedPlayers}
            onChange={(_, v, reason) => {
              if (v.length <= 21) {
                setSelectedPlayers(v);
                if (v.length === 21 && reason === 'selectOption') setAutocompleteOpen(false);
              }
            }}
            open={autocompleteOpen}
            onOpen={() => setAutocompleteOpen(true)}
            onClose={() => setAutocompleteOpen(false)}
            filterSelectedOptions
            disableCloseOnSelect
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionDisabled={option =>
              subscribedPlayerIds.includes(option.id) && !selectedPlayers.some((p: any) => p.id === option.id)
            }
            renderInput={params => (
              <TextField {...params} label="בחר שחקנים" placeholder="התחל להקליד שם..." />
            )}
            renderTags={(value, getTagProps) =>
              <Box sx={{ maxHeight: 80, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {value.map((option, index) => (
                  <Chip label={option.name} {...getTagProps({ index })} />
                ))}
              </Box>
            }
            sx={{ mt: 2 }}
          />
          {selectedPlayers.length > 21 && (
            <Typography color="error" sx={{ mt: 1 }}>ניתן לבחור עד 21 שחקנים בלבד</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button variant="contained" disabled={selectedPlayers.length !== 21 || saving} onClick={handleSaveDialog}>
            {saving ? 'שומר...' : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setPendingDeleteDay(null); }}>
        <DialogTitle>אישור מחיקה</DialogTitle>
        <DialogContent>
          <Typography>האם אתה בטוח שברצונך למחוק את המנויים ליום זה?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setPendingDeleteDay(null); }}>ביטול</Button>
          <Button color="error" variant="contained" onClick={handleRemoveSubscription}>מחק</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={createDialogOpen} onClose={() => { setCreateDialogOpen(false); setPendingCreateDay(null); }}>
        <DialogTitle>אישור יצירת ערב משחק</DialogTitle>
        <DialogContent>
          <Typography>
            {`האם ליצור ערב משחק עבור יום ${DAYS.find(d => d.key === pendingCreateDay)?.label}${pendingCreateDay ? ` ה-${getNextDateForDay(pendingCreateDay).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' })}` : ''}?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); setPendingCreateDay(null); }}>ביטול</Button>
          <Button color="primary" variant="contained" onClick={handleCreateGameNight} disabled={creating}>
            {creating ? 'יוצר...' : 'צור'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Date Conflict Dialog */}
      <Dialog open={dateConflictDialogOpen} onClose={handleDateConflictClose}>
        <DialogTitle>תאריך זה כבר בשימוש</DialogTitle>
        <DialogContent>
          <Typography>
            התאריך {conflictingDate ? new Date(conflictingDate).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} כבר בשימוש. בחר תאריך אחר לערב המשחק.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDateConflictClose} color="primary">סגור</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 