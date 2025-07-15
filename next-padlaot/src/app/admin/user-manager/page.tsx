'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Box, Typography, Autocomplete, TextField, InputAdornment, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import { useState } from 'react';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/contexts/ToastContext';
import { useUsersCache } from '@/hooks/useUsersCache';
import { usePlayersCache } from '@/hooks/usePlayersCache';

export default function UserManagerPage() {
  // All hooks at the top
  const { userData, loading } = useAuth();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<any>(null);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [userToUnlink, setUserToUnlink] = useState<any>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [userToRole, setUserToRole] = useState<any>(null);
  const [roleAction, setRoleAction] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const { showToast } = useToast ? useToast() : { showToast: undefined };
  const { users, loading: loadingUsers } = useUsersCache();
  const { players, loading: loadingPlayers } = usePlayersCache();
  const [searchEmail, setSearchEmail] = useState<string>('');
  const emailOptions = users.map(u => u.email).filter(Boolean);
  const filteredUsers = searchEmail && searchEmail.trim() !== ''
    ? users.filter(u => u.email && u.email.toLowerCase().includes(searchEmail.toLowerCase()))
    : users;

  // Early returns
  if (loading) return null;
  if (!userData || userData.role !== 'super-admin') return (
    <Box sx={{ mt: 8, textAlign: 'center' }}>
      <Typography variant="h5" color="error" fontWeight={700}>
        אין לך הרשאה לצפות בדף זה
      </Typography>
    </Box>
  );
  if (loadingUsers || loadingPlayers) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!users.length) return <Box sx={{ mt: 8, textAlign: 'center', color: 'text.secondary' }}>לא נמצאו משתמשים</Box>;
  if (searchEmail && searchEmail.trim() !== '' && filteredUsers.length === 0) return <Box sx={{ mt: 8, textAlign: 'center', color: 'text.secondary' }}>לא נמצא משתמש עם האימייל הזה</Box>;

  // Helpers
  const superAdminCount = users.filter(u => u.role === 'super-admin').length;
  const isSelf = (user: any) => user.uid === userData.uid;

  // Remove user logic
  const handleRemoveUser = (user: any) => {
    setUserToRemove(user);
    setRemoveDialogOpen(true);
  };
  const confirmRemoveUser = async () => {
    if (!userToRemove) return;
    if (isSelf(userToRemove)) {
      showToast && showToast('לא ניתן להסיר את עצמך', 'error');
      setRemoveDialogOpen(false);
      setUserToRemove(null);
      return;
    }
    if (userToRemove.role === 'super-admin' && superAdminCount <= 1) {
      showToast && showToast('לא ניתן להסיר את הסופר-אדמין האחרון', 'error');
      setRemoveDialogOpen(false);
      setUserToRemove(null);
      return;
    }
    try {
      // Remove linkage if exists
      if (userToRemove.playerId) {
        const playerRef = doc(db, 'players', userToRemove.playerId);
        await updateDoc(playerRef, { userId: '' });
      }
      // Remove user
      await deleteDoc(doc(db, 'users', userToRemove.uid));
      showToast && showToast('המשתמש הוסר בהצלחה', 'success');
    } catch (err) {
      showToast && showToast('שגיאה בהסרת המשתמש', 'error');
    } finally {
      setRemoveDialogOpen(false);
      setUserToRemove(null);
    }
  };

  // Remove player linkage logic
  const handleUnlinkPlayer = (user: any) => {
    setUserToUnlink(user);
    setUnlinkDialogOpen(true);
  };
  const confirmUnlinkPlayer = async () => {
    if (!userToUnlink) return;
    setUnlinking(true);
    try {
      // Remove linkage from user
      const userRef = doc(db, 'users', userToUnlink.uid);
      await updateDoc(userRef, { playerId: '', playerName: '' });
      // Remove linkage from player
      if (userToUnlink.playerId) {
        const playerRef = doc(db, 'players', userToUnlink.playerId);
        await updateDoc(playerRef, { userId: '' });
      }
      showToast && showToast('השיוך הוסר בהצלחה', 'success');
    } catch (err) {
      showToast && showToast('שגיאה בהסרת השיוך', 'error');
    } finally {
      setUnlinkDialogOpen(false);
      setUserToUnlink(null);
      setUnlinking(false);
    }
  };

  // Role management logic
  const handleRoleDialog = (user: any) => {
    setUserToRole(user);
    setRoleDialogOpen(true);
    setRoleAction(null);
  };
  const handleRoleChange = (action: string) => {
    setRoleAction(action);
  };
  const confirmRoleChange = async () => {
    if (!userToRole || !roleAction) return;
    if (isSelf(userToRole) && roleAction !== userToRole.role) {
      showToast && showToast('לא ניתן לשנות את ההרשאות של עצמך', 'error');
      setRoleDialogOpen(false);
      setUserToRole(null);
      setRoleAction(null);
      return;
    }
    if (userToRole.role === 'super-admin' && roleAction !== 'super-admin' && superAdminCount <= 1) {
      showToast && showToast('לא ניתן להסיר את הסופר-אדמין האחרון', 'error');
      setRoleDialogOpen(false);
      setUserToRole(null);
      setRoleAction(null);
      return;
    }
    setRoleLoading(true);
    try {
      await updateDoc(doc(db, 'users', userToRole.uid), { role: roleAction });
      showToast && showToast('הרשאות המשתמש עודכנו בהצלחה', 'success');
    } catch (err) {
      showToast && showToast('שגיאה בעדכון ההרשאות', 'error');
    } finally {
      setRoleLoading(false);
      setRoleDialogOpen(false);
      setUserToRole(null);
      setRoleAction(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4 }}>
      {/* Search bar styled like player management */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center', maxWidth: 500, mx: 'auto' }}>
        <Autocomplete
          options={emailOptions}
          value={searchEmail}
          onInputChange={(_, v) => setSearchEmail(v)}
          freeSolo
          clearOnEscape
          sx={{ minWidth: 240, flex: 1 }}
          renderInput={params => (
            <TextField
              {...params}
              label="חפש לפי אימייל"
              variant="outlined"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <InputAdornment position="end">
                    {searchEmail ? (
                      <IconButton size="small" onClick={() => setSearchEmail('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    {params.InputProps.endAdornment}
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Box>
      <Typography variant="h4" fontWeight={900} color="primary" align="center" gutterBottom>
        ניהול משתמשים
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">מזהה משתמש</TableCell>
              <TableCell align="center">אימייל</TableCell>
              <TableCell align="center">שחקן משויך</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map(user => {
              const linkedPlayer = user.playerId ? players.find((p: any) => p.id === user.playerId) : null;
              return (
                <TableRow key={user.uid}>
                  <TableCell
                    align="center"
                    sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 700, textDecoration: 'underline' }}
                    onClick={() => handleRoleDialog(user)}
                  >
                    {user.uid}
                  </TableCell>
                  <TableCell align="center">{user.email}</TableCell>
                  <TableCell align="center">
                    {linkedPlayer ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        {linkedPlayer.name}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleUnlinkPlayer(user)}
                          disabled={unlinking}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleRemoveUser(user)}
                      disabled={isSelf(user) || (user.role === 'super-admin' && superAdminCount <= 1)}
                    >
                      הסר
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Remove User Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)}>
        <DialogTitle>אישור הסרת משתמש</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך להסיר את המשתמש {userToRemove?.email} ({userToRemove?.uid})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(false)}>ביטול</Button>
          <Button color="error" variant="contained" onClick={confirmRemoveUser}>הסר</Button>
        </DialogActions>
      </Dialog>

      {/* Remove Player Linkage Confirmation Dialog */}
      <Dialog open={unlinkDialogOpen} onClose={() => setUnlinkDialogOpen(false)}>
        <DialogTitle>אישור הסרת שיוך שחקן</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך להסיר את השיוך בין המשתמש {userToUnlink?.email} לשחקן {userToUnlink?.playerName}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlinkDialogOpen(false)}>ביטול</Button>
          <Button color="error" variant="contained" onClick={confirmUnlinkPlayer} disabled={unlinking}>
            {unlinking ? 'מסיר...' : 'הסר שיוך'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>ניהול הרשאות משתמש</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {userToRole && (
              <>
                <b>משתמש:</b> {userToRole.email}<br />
                <b>הרשאה נוכחית:</b> {userToRole.role === 'super-admin' ? 'סופר-אדמין' : userToRole.role === 'admin' ? 'מנהל' : 'משתמש'}
              </>
            )}
          </Typography>
          {userToRole && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {userToRole.role !== 'admin' && (
                <Button
                  variant={roleAction === 'admin' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => handleRoleChange('admin')}
                  disabled={roleLoading}
                >
                  הפוך למנהל
                </Button>
              )}
              {userToRole.role !== 'super-admin' && (
                <Button
                  variant={roleAction === 'super-admin' ? 'contained' : 'outlined'}
                  color="secondary"
                  onClick={() => handleRoleChange('super-admin')}
                  disabled={roleLoading}
                >
                  הפוך לסופר-אדמין
                </Button>
              )}
              {userToRole.role !== 'user' && (
                <Button
                  variant={roleAction === 'user' ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => handleRoleChange('user')}
                  disabled={roleLoading}
                >
                  הסר הרשאות מנהל
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)} disabled={roleLoading}>ביטול</Button>
          <Button
            onClick={confirmRoleChange}
            color="success"
            variant="contained"
            disabled={!roleAction || roleLoading}
          >
            {roleLoading ? 'מעדכן...' : 'עדכן הרשאות'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 