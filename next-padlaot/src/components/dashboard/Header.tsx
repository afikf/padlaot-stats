import { AppBar, Toolbar, Typography, Button, Box, Avatar, Chip, Stack } from '@mui/material';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter } from 'next/navigation';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export default function Header() {
  const { user, userData, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getUserRoleLabel = (role?: string) => {
    if (role === 'super-admin') return 'מנהל על';
    if (role === 'admin') return 'מנהל';
    if (role === 'user') return 'משתמש';
    return '';
  };
  const getUserRoleColor = (role?: string) => {
    if (role === 'super-admin') return '#e53935'; // red
    if (role === 'admin') return '#8e24aa'; // purple
    if (role === 'user') return '#1976d2'; // blue
    return '#bdbdbd'; // default grey
  };

  if (isMobile) {
    // Mobile layout: bulletproof, no horizontal scroll
    return (
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255,255,255,0.95)',
          color: '#1e3a8a',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 4px 24px -8px #a5b4fc44',
          backdropFilter: 'blur(8px)',
          mb: 3,
          width: '100vw',
          maxWidth: '100vw',
          overflow: 'hidden',
        }}
      >
        <Toolbar sx={{ flexDirection: 'column', alignItems: 'center', width: '100vw', maxWidth: '100vw', minWidth: 0, px: 0, py: 1, overflow: 'hidden' }}>
          {/* Top: Logo & Title */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ justifyContent: 'center', width: '100%', maxWidth: '100vw', mb: 1, overflow: 'hidden' }}>
            <img src="/logo.jpeg" alt="פדלאות לוגו" style={{ height: 32, width: 'auto', marginLeft: 8, borderRadius: 8, boxShadow: '0 2px 8px -2px #7c3aed44' }} />
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: 1, fontFamily: 'Assistant, Nunito, sans-serif', color: '#7c3aed', fontSize: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60vw' }}>
              דשבורד פדלאות
            </Typography>
          </Stack>
          {isAdmin && (
            <Button
              variant="outlined"
              color="secondary"
              sx={{ fontWeight: 600, borderRadius: 3, borderWidth: 2, borderColor: '#a5b4fc', color: '#7c3aed', background: 'rgba(236, 72, 153, 0.08)', boxShadow: '0 2px 8px -2px #f472b644', transition: 'all 0.2s', '&:hover': { background: '#f0abfc22', borderColor: '#f472b6' }, mb: 1, width: '100%' }}
              onClick={() => router.push('/admin')}
            >
              פאנל ניהול
            </Button>
          )}
          {/* User Info */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ justifyContent: 'center', width: '100%', maxWidth: '100vw', flexWrap: 'wrap', mb: 1, overflow: 'hidden' }}>
            <Avatar sx={{ bgcolor: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)', width: 32, height: 32, fontWeight: 700, fontSize: 18, boxShadow: '0 2px 8px -2px #7c3aed44', border: '2px solid #f0abfc' }}>
              <span role="img" aria-label="user">👤</span>
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e3a8a', fontFamily: 'Assistant, Nunito, sans-serif', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40vw' }}>
              {user?.email}
            </Typography>
            {userData?.role && (
              <Chip
                label={getUserRoleLabel(userData.role)}
                size="small"
                sx={{ fontWeight: 700, fontSize: 13, bgcolor: getUserRoleColor(userData.role), color: '#fff', ml: 1 }}
              />
            )}
            {userData?.playerName && (
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#06b6d4', fontFamily: 'Assistant, Nunito, sans-serif', ml: 1, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '30vw' }}>
                ({userData.playerName})
              </Typography>
            )}
          </Stack>
          {/* Logout Button */}
          <Button variant="contained" color="primary" onClick={logout} sx={{ fontWeight: 700, borderRadius: 3, width: '100%', mb: 1 }}>
            התנתק
          </Button>
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'rgba(255,255,255,0.95)',
        color: '#1e3a8a',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 4px 24px -8px #a5b4fc44',
        backdropFilter: 'blur(8px)',
        mb: 3,
      }}
    >
      <Toolbar sx={{ minHeight: 80, display: 'flex', justifyContent: 'space-between', px: { xs: 1, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <img src="/logo.jpeg" alt="פדלאות לוגו" style={{ height: 48, width: 'auto', marginLeft: 12, borderRadius: 12, boxShadow: '0 2px 8px -2px #7c3aed44' }} />
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: 1, fontFamily: 'Assistant, Nunito, sans-serif', color: '#7c3aed' }}>
            דשבורד פדלאות
          </Typography>
          {isAdmin && (
            <Button
              variant="outlined"
              color="secondary"
              sx={{ ml: 2, fontWeight: 600, borderRadius: 3, borderWidth: 2, borderColor: '#a5b4fc', color: '#7c3aed', background: 'rgba(236, 72, 153, 0.08)', boxShadow: '0 2px 8px -2px #f472b644', transition: 'all 0.2s', '&:hover': { background: '#f0abfc22', borderColor: '#f472b6' } }}
              onClick={() => router.push('/admin')}
            >
              פאנל ניהול
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user?.email && (
            <>
              <Avatar sx={{ bgcolor: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)', width: 44, height: 44, fontWeight: 700, fontSize: 22, boxShadow: '0 2px 8px -2px #7c3aed44', border: '3px solid #f0abfc' }}>
                <span role="img" aria-label="user">👤</span>
              </Avatar>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e3a8a', fontFamily: 'Assistant, Nunito, sans-serif' }}>
                {user.email}
              </Typography>
              {userData?.role && (
                <Chip
                  label={getUserRoleLabel(userData.role)}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: 15, bgcolor: getUserRoleColor(userData.role), color: '#fff', ml: 1 }}
                />
              )}
              {userData?.playerName && (
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#06b6d4', fontFamily: 'Assistant, Nunito, sans-serif', ml: 1 }}>
                  ({userData.playerName})
                </Typography>
              )}
            </>
          )}
          <Button variant="contained" color="primary" onClick={logout} sx={{ ml: 2, fontWeight: 700, borderRadius: 3, background: 'linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%)', color: '#fff', boxShadow: '0 2px 8px -2px #7c3aed44', transition: 'all 0.2s', '&:hover': { background: 'linear-gradient(90deg, #06b6d4 0%, #7c3aed 100%)' } }}>
            התנתק
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 