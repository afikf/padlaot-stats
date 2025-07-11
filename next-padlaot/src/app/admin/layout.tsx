"use client";
import { AppBar, Toolbar, Typography, Button, Tabs, Tab, Box, Container, Avatar, useMediaQuery, Divider, Fade } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Header from '@/components/Header';

const navItems = [
  { label: 'דשבורד', href: '/admin', icon: <DashboardIcon sx={{ mr: 1, color: '#7c3aed' }} /> },
  { label: 'יצירת ערב משחק', href: '/admin/create-game-night', icon: <AddCircleOutlineIcon sx={{ mr: 1, color: '#06b6d4' }} /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentTab = navItems.findIndex((item) => pathname === item.href);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'transparent',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 40%, #f0abfc 100%)',
        position: 'relative',
        pt: { xs: 3, sm: 5 },
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
        tabs={
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
        }
      />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Fade in timeout={500}>
          <Box>
            {children}
          </Box>
        </Fade>
      </Container>
    </Box>
  );
} 