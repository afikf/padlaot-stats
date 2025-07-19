import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { Tournament, TournamentMiniGame } from '@/types/tournament';

interface TournamentTabsProps {
  tournament: Tournament;
  miniGames: TournamentMiniGame[];
  players: any[];
  groupStageContent: React.ReactNode;
  knockoutContent: React.ReactNode;
  activeTab?: 'group' | 'knockout';
  onTabChange?: (tab: 'group' | 'knockout') => void;
}

export default function TournamentTabs({
  tournament,
  miniGames,
  players,
  groupStageContent,
  knockoutContent,
  activeTab,
  onTabChange,
}: TournamentTabsProps) {
  const [internalTab, setInternalTab] = useState(0);
  const groupStageComplete = tournament.settings?.groupStageComplete;
  
  // Use external tab state if provided, otherwise use internal state
  const tab = activeTab === 'knockout' ? 1 : 0;
  const setTab = (newValue: number) => {
    if (onTabChange) {
      onTabChange(newValue === 1 ? 'knockout' : 'group');
    } else {
      setInternalTab(newValue);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab label="שלב בתים" />
        <Tab label="נוקאאוט" disabled={!groupStageComplete} />
      </Tabs>
      <Box hidden={tab !== 0}>{tab === 0 && groupStageContent}</Box>
      <Box hidden={tab !== 1}>{tab === 1 && knockoutContent}</Box>
    </Box>
  );
} 