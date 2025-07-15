import React from 'react';
import { AppBar, Toolbar, Box, Typography, Button, Avatar, Stack, Chip } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface HeaderProps {
  title: string;
  logoSrc?: string;
  navButtonLabel?: string;
  onNavButtonClick?: () => void;
  userEmail: string;
  userName?: string;
  userAvatarUrl?: string;
  onLogout: () => void;
  tabs?: React.ReactNode;
  children?: React.ReactNode;
  userRole?: string;
}

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

const Header: React.FC<HeaderProps> = ({
  title,
  logoSrc,
  navButtonLabel,
  onNavButtonClick,
  userEmail,
  userName,
  userAvatarUrl,
  onLogout,
  tabs,
  children,
  userRole,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    // Mobile layout: stack everything vertically, move logout button below user info
    return (
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderRadius: 3, mt: 2, mb: 2 }}>
        <Toolbar sx={{ flexDirection: 'column', alignItems: 'stretch', width: '100%', minWidth: 0, px: 1, py: 1 }}>
          {/* Top: Logo & Title */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ justifyContent: 'center', width: '100%', mb: 1 }}>
            {logoSrc && (
              <Box component="img" src={logoSrc} alt="logo" sx={{ height: 32, borderRadius: 2 }} />
            )}
            <Typography variant="h5" fontWeight={900} color="primary" sx={{ letterSpacing: 1, fontSize: '1.2rem' }}>
              {title}
            </Typography>
          </Stack>
          {/* Navigation Button (if any) */}
          {navButtonLabel && onNavButtonClick && (
            <Button
              variant="outlined"
              color="primary"
              onClick={onNavButtonClick}
              sx={{ fontWeight: 700, borderRadius: 3, mb: 1, width: '100%' }}
            >
              {navButtonLabel}
            </Button>
          )}
          {/* User Info */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ justifyContent: 'center', width: '100%', flexWrap: 'wrap', mb: 1 }}>
            <Avatar src={userAvatarUrl} sx={{ border: '2px solid #B388FF', bgcolor: 'white', width: 32, height: 32 }} />
            <Typography variant="body2" color="primary" fontWeight={700} sx={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>
              {userName && <span>({userName}) </span>}{userEmail}
            </Typography>
            {userRole && (
              <Chip
                label={getUserRoleLabel(userRole)}
                size="small"
                sx={{ fontWeight: 700, fontSize: 13, bgcolor: getUserRoleColor(userRole), color: '#fff' }}
              />
            )}
          </Stack>
          {/* Logout Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={onLogout}
            sx={{ fontWeight: 700, borderRadius: 3, width: '100%', mb: 1 }}
          >
            התנתק
          </Button>
        </Toolbar>
        {/* Tabs or extra content below header */}
        {tabs && (
          <Box sx={{ px: 0, pt: 1, width: '100%', overflowX: 'auto' }}>
            {tabs}
          </Box>
        )}
        {children}
      </AppBar>
    );
  }

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderRadius: 3, mt: 2, mb: 2 }}>
      <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', width: '100%', minWidth: 0, overflowX: 'auto', px: { xs: 1, sm: 2 } }}>
        {/* Left: Navigation Button */}
        {navButtonLabel && onNavButtonClick && (
          <Button
            variant="outlined"
            color="primary"
            onClick={onNavButtonClick}
            sx={{ minWidth: 120, fontWeight: 700, borderRadius: 3, ml: 2 }}
          >
            {navButtonLabel}
          </Button>
        )}

        {/* Center: Logo & Title */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1, justifyContent: 'center', width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
          {logoSrc && (
            <Box component="img" src={logoSrc} alt="logo" sx={{ height: 40, borderRadius: 2 }} />
          )}
          <Typography variant="h4" fontWeight={900} color="primary" sx={{ letterSpacing: 1 }}>
            {title}
          </Typography>
        </Stack>

        {/* Right: User Info & Logout */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flexWrap: 'wrap' }}>
          <Typography variant="body1" color="primary" fontWeight={700}>
            {userName && <span>({userName}) </span>}{userEmail}
          </Typography>
          {userRole && (
            <Chip
              label={getUserRoleLabel(userRole)}
              size="small"
              sx={{ fontWeight: 700, fontSize: 15, bgcolor: getUserRoleColor(userRole), color: '#fff' }}
            />
          )}
          <Avatar src={userAvatarUrl} sx={{ border: '2px solid #B388FF', bgcolor: 'white' }} />
          <Button
            variant="contained"
            color="primary"
            onClick={onLogout}
            sx={{ minWidth: 100, fontWeight: 700, borderRadius: 3, mr: 2 }}
          >
            התנתק
          </Button>
        </Stack>
      </Toolbar>
      {/* Tabs or extra content below header */}
      {tabs && (
        <Box sx={{ px: 3, pt: 1 }}>
          {tabs}
        </Box>
      )}
      {children}
    </AppBar>
  );
};

export default Header; 