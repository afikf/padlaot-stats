import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, userData, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const router = useRouter();

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