'use client';
import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Autocomplete, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { usePlayersCache } from '@/hooks/usePlayersCache';
import { getAllUsers, getUserData } from '@/lib/firebase/users';
import { collection, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/contexts/ToastContext';
import { useUsersCache } from '@/hooks/useUsersCache';

export default function PlayerManagerPage() {
  const { players, loading, error } = usePlayersCache();
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<any>(null);
  const { showToast } = useToast ? useToast() : { showToast: () => {} };
  const [sortField, setSortField] = useState<'name' | 'user'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editGoals, setEditGoals] = useState(0);
  const [editAssists, setEditAssists] = useState(0);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const { users: allUsers, loading: loadingUsers } = useUsersCache();
  const [editLoading, setEditLoading] = useState(false);

  const handleSort = (field: 'name' | 'user') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Batch fetch user emails for all players with userID
  useEffect(() => {
    if (!players || players.length === 0) return;
    async function fetchEmails() {
      const ids = players
        .map((p: any) => p.userId)
        .filter((id: string | undefined) => !!id);
      if (ids.length === 0) return;
      const entries = await Promise.all(
        ids.map(async (id: string) => {
          try {
            const user = await getUserData(id);
            console.log('Fetched user for id', id, ':', user);
            return [id, user?.email || null];
          } catch (err) {
            console.error('Error fetching user for id', id, err);
            return [id, null];
          }
        })
      );
      setUserEmails(Object.fromEntries(entries));
    }
    fetchEmails();
  }, [players]);

  // Open edit dialog and populate fields
  const handleOpenEdit = (player: any) => {
    setPlayerToEdit(player);
    setEditName(player.name || '');
    setEditGoals(player.totalGoals ?? 0);
    setEditAssists(player.totalAssists ?? 0);
    setEditUserId(player.userId || null);
    setEditDialogOpen(true);
  };

  // Save changes
  const handleSaveEdit = async () => {
    if (!playerToEdit) return;
    setEditLoading(true);
    try {
      // Update player doc
      await updateDoc(doc(db, 'players', playerToEdit.id), {
        name: editName,
        totalGoals: Number(editGoals),
        totalAssists: Number(editAssists),
        userId: editUserId || undefined
      });
      // Handle user linkage
      const prevUserId = playerToEdit.userId;
      if (prevUserId && prevUserId !== editUserId) {
        // Unlink previous user
        await updateDoc(doc(db, 'users', prevUserId), {
          playerId: undefined,
          playerName: undefined
        });
      }
      if (editUserId) {
        // Link new user
        const userDocRef = doc(db, 'users', editUserId);
        const userDoc = await getUserData(editUserId);
        await setDoc(userDocRef, {
          ...userDoc,
          playerId: playerToEdit.id,
          playerName: editName
        }, { merge: true });
      }
      showToast && showToast('שחקן עודכן בהצלחה', 'success');
      setEditDialogOpen(false);
      setPlayerToEdit(null);
    } catch (err) {
      showToast && showToast('שגיאה בעדכון שחקן', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Unlink user
  const handleUnlinkUser = () => {
    setEditUserId(null);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'players'), {
        name: newPlayerName.trim(),
        totalWins: 0,
        totalMiniGames: 0,
        totalGoals: 0,
        totalGameNights: 0,
        totalAssists: 0,
        isActive: true
      });
      setAddDialogOpen(false);
      setNewPlayerName('');
      showToast && showToast('שחקן נוסף בהצלחה', 'success');
    } catch (err) {
      showToast && showToast('שגיאה בהוספת שחקן', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;
    setAdding(true);
    try {
      // 1. Remove player doc
      await deleteDoc(doc(db, 'players', playerToDelete.id));
      // 2. If player has userId, update user doc
      if (playerToDelete.userId) {
        await updateDoc(doc(db, 'users', playerToDelete.userId), {
          playerId: undefined,
          playerName: undefined
        });
      }
      showToast && showToast('שחקן נמחק בהצלחה', 'success');
    } catch (err) {
      showToast && showToast('שגיאה במחיקת שחקן', 'error');
    } finally {
      setAdding(false);
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
      setSearch(''); // Clear search filter after delete
    }
  };

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let result = players;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.userId && userEmails[p.userId] && userEmails[p.userId].toLowerCase().includes(q))
      );
    }
    // Sorting
    return result.slice().sort((a: any, b: any) => {
      let aValue = '';
      let bValue = '';
      if (sortField === 'name') {
        aValue = a.name || '';
        bValue = b.name || '';
      } else if (sortField === 'user') {
        aValue = a.userId ? userEmails[a.userId] || '' : '';
        bValue = b.userId ? userEmails[b.userId] || '' : '';
      }
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue, 'he');
      } else {
        return bValue.localeCompare(aValue, 'he');
      }
    });
  }, [players, search, userEmails, sortField, sortDirection]);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight={900} color="primary" align="center" gutterBottom>
        ניהול שחקנים
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
              הוסף שחקן
            </Button>
          </Box>
        </CardContent>
      </Card>
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>הוסף שחקן חדש</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="שם שחקן"
            fullWidth
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            disabled={adding}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={adding}>ביטול</Button>
          <Button onClick={handleAddPlayer} variant="contained" disabled={!newPlayerName.trim() || adding}>שמור</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>מחיקת שחקן</DialogTitle>
        <DialogContent>
          האם אתה בטוח שברצונך למחוק את השחקן "{playerToDelete?.name}"? פעולה זו אינה הפיכה.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={adding}>ביטול</Button>
          <Button onClick={handleDeletePlayer} color="error" variant="contained" disabled={adding}>מחק</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>עריכת שחקן</DialogTitle>
        <DialogContent>
          <TextField
            label="שם"
            fullWidth
            margin="dense"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            disabled={editLoading}
          />
          <TextField
            label={'סה"כ שערים'}
            type="number"
            fullWidth
            margin="dense"
            value={editGoals}
            onChange={e => setEditGoals(Number(e.target.value))}
            disabled={editLoading}
          />
          <TextField
            label={'סה"כ בישולים'}
            type="number"
            fullWidth
            margin="dense"
            value={editAssists}
            onChange={e => setEditAssists(Number(e.target.value))}
            disabled={editLoading}
          />
          {editUserId ? (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="משתמש מקושר"
                value={allUsers.find(u => u.uid === editUserId)?.email || ''}
                fullWidth
                disabled
              />
              <Button onClick={handleUnlinkUser} color="warning" disabled={editLoading}>הסר קישור</Button>
            </Box>
          ) : (
            <Autocomplete
              options={allUsers}
              getOptionLabel={option => option.email || ''}
              value={allUsers.find(u => u.uid === editUserId) || null}
              onChange={(_, v) => setEditUserId(v ? v.uid : null)}
              renderInput={params => (
                <TextField {...params} label="קשר משתמש (אופציונלי)" margin="dense" fullWidth disabled={editLoading || loadingUsers} />
              )}
              isOptionEqualToValue={(option, value) => option.uid === value?.uid}
              getOptionDisabled={option => option.playerId && option.playerId !== playerToEdit?.id}
              renderOption={(props, option) => (
                <li {...props} style={option.playerId && option.playerId !== playerToEdit?.id ? { color: '#888' } : {}}>
                  {option.email + (option.playerId && option.playerId !== playerToEdit?.id ? ' (כבר מקושר)' : '')}
                </li>
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={editLoading}>ביטול</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={editLoading || !editName.trim()}>שמור</Button>
        </DialogActions>
      </Dialog>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : error ? (
        <Typography color="error">שגיאה בטעינת השחקנים: {error}</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  שם
                  {sortField === 'name' && (sortDirection === 'asc' ? <ArrowDropUpIcon fontSize="small" /> : <ArrowDropDownIcon fontSize="small" />)}
                </TableCell>
                <TableCell>סה"כ שערים</TableCell>
                <TableCell>סה"כ בישולים</TableCell>
                <TableCell onClick={() => handleSort('user')} style={{ cursor: 'pointer' }}>
                  משתמש מקושר
                  {sortField === 'user' && (sortDirection === 'asc' ? <ArrowDropUpIcon fontSize="small" /> : <ArrowDropDownIcon fontSize="small" />)}
                </TableCell>
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPlayers.map((player: any) => (
                <TableRow key={player.id}>
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.totalGoals ?? ''}</TableCell>
                  <TableCell>{player.totalAssists ?? ''}</TableCell>
                  <TableCell>{player.userId ? (userEmails[player.userId] || 'לא נמצא') : ''}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleOpenEdit(player)}><EditIcon /></IconButton>
                    <IconButton color="error" onClick={() => { setPlayerToDelete(player); setDeleteDialogOpen(true); }}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
} 