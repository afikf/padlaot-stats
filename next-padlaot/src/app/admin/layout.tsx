"use client";
import { Tabs, Tab, Box, Container, useMediaQuery, Fade } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import SubscriptionsIcon from '@mui/icons-material/HowToReg';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Header from '@/components/Header';
import { AdminProvider } from '@/contexts/AdminContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // Build nav items dynamically based on role
  const navItems = [
    { label: 'דשבורד', href: '/admin', icon: <DashboardIcon sx={{ mr: 1, color: '#7c3aed' }} /> },
    { label: 'יצירת ערב משחק', href: '/admin/create-game-night', icon: <AddCircleOutlineIcon sx={{ mr: 1, color: '#06b6d4' }} /> },
    { label: 'ניהול מנויים', href: '/admin/subscriptions', icon: <SubscriptionsIcon sx={{ mr: 1, color: '#f59e42' }} /> },
    { label: 'ניהול שחקנים', href: '/admin/player-manager', icon: <GroupIcon sx={{ mr: 1, color: '#10b981' }} /> },
    ...(userData?.role === 'super-admin' ? [
      { label: 'ניהול משתמשים', href: '/admin/user-manager', icon: <AdminPanelSettingsIcon sx={{ mr: 1, color: '#f43f5e' }} /> },
      { label: 'איפוס מסד נתונים', href: '/admin/reset-database', icon: <DeleteForeverIcon sx={{ mr: 1, color: '#dc2626' }} /> },
    ] : []),
  ];
  const currentTab = navItems.findIndex((item) => pathname === item.href);

  return (
    <AdminProvider>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'transparent',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 40%, #f0abfc 100%)',
          position: 'relative',
          pt: { xs: 3, sm: 5 },
          width: '100vw',
          maxWidth: '100vw',
          overflowX: 'hidden',
        }}
      >
        <Header
          title="פאנל ניהול"
          logoSrc="/logo.jpeg"
          navButtonLabel="חזרה לדשבורד הראשי"
          onNavButtonClick={() => router.push('/dashboard')}
          userEmail={user?.email || ''}
          userAvatarUrl={user?.photoURL || ''}
          onLogout={logout}
          userRole={userData?.role}
          tabs={
            <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100vw', overflowX: 'auto' }}>
              <Tabs
                value={currentTab === -1 ? false : currentTab}
                onChange={(_, v) => router.push(navItems[v].href)}
                textColor="primary"
                indicatorColor="secondary"
                variant={isMobile ? 'scrollable' : 'fullWidth'}
                scrollButtons={isMobile ? 'auto' : false}
                sx={{
                  minHeight: 56,
                  bgcolor: 'rgba(248,250,252,0.85)',
                  borderRadius: 3,
                  boxShadow: '0 2px 8px -2px #a5b4fc33',
                  mb: 2,
                  fontFamily: 'Assistant, Nunito, sans-serif',
                  mx: { xs: 2, sm: 4 },
                  width: '100%',
                  minWidth: 0,
                  maxWidth: '100vw',
                  overflowX: 'auto',
                }}
                TabIndicatorProps={{
                  style: {
                    height: 5,
                    borderRadius: 3,
                    background: 'linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%)',
                    transition: 'all 0.3s cubic-bezier(.4,2,.6,1)',
                  },
                }}
              >
                {navItems.map((item, idx) => (
                  <Tab
                    key={item.href}
                    label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{item.icon}{item.label}</Box>}
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      minWidth: 140,
                      borderRadius: 2,
                      color: currentTab === idx ? '#7c3aed' : '#334155',
                      transition: 'all 0.2s',
                      textTransform: 'none',
                      letterSpacing: 0.5,
                      px: 3,
                      py: 1.5,
                      '&:hover': {
                        background: 'rgba(124,58,237,0.08)',
                        color: '#06b6d4',
                      },
                    }}
                  />
                ))}
              </Tabs>
            </Box>
          }
        />
        <Container maxWidth="lg" sx={{ py: 6, width: '100vw', maxWidth: '100vw', overflowX: 'hidden', px: { xs: 0, sm: 4 } }}>
          <Fade in timeout={500}>
            <Box>
              {children}
            </Box>
          </Fade>
        </Container>
      </Box>
    </AdminProvider>
  );
} 