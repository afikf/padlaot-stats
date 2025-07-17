import React from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, IconButton, Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { TOURNAMENT_STATUS_MAP } from '@/types/tournament';
import { useRouter } from 'next/navigation';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getStatusLabel(status: number | string) {
  const statusNum = typeof status === 'string' ? parseInt(status) : status;
  switch (statusNum) {
    case 0:
      return { label: 'טיוטה', color: 'default' as const };
    case 1:
      return { label: 'עתידי', color: 'warning' as const };
    case 2:
      return { label: 'חי', color: 'error' as const };
    case 3:
      return { label: 'הושלם', color: 'success' as const };
    case 4:
      return { label: 'לא הושלם', color: 'error' as const };
    default:
      return { label: 'לא ידוע', color: 'default' as const };
  }
}

export default function TournamentsAccordion({ tournaments, onEdit, onDelete, onMakeLive }: {
  tournaments: any[];
  onEdit?: (t: any) => void;
  onDelete?: (t: any) => void;
  onMakeLive?: (t: any) => void;
}) {
  const router = useRouter();
  if (!tournaments || tournaments.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">לא נמצאו טורנירים</Typography>
      </Box>
    );
  }
  // Move live tournaments to top
  const sorted = [...tournaments].sort((a, b) => (b.status === 2 ? 1 : 0) - (a.status === 2 ? 1 : 0));
  return (
    <Box>
      {sorted.map((tournament) => {
        const statusInfo = getStatusLabel(tournament.status);
        return (
          <Accordion key={tournament.id} sx={{ mb: 2, borderRadius: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography fontWeight={600}>{formatDate(tournament.date)}</Typography>
                <Chip 
                  label={statusInfo.label}
                  color={statusInfo.color}
                  size="small"
                  variant="outlined"
                />
                <Chip 
                  label={`מגרשים: ${tournament.settings?.numberOfPitches ?? '-'}`}
                  color="default"
                  size="small"
                  variant="outlined"
                />
                <Box sx={{ flexGrow: 1 }} />
                {/* Make Live button for upcoming tournaments */}
                {onMakeLive && tournament.status === 1 && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 700, ml: 1 }}
                    onClick={e => { e.stopPropagation(); onMakeLive(tournament); }}
                  >
                    הפוך לחי
                  </Button>
                )}
                {/* Manage Live button for live tournaments */}
                {tournament.status === 2 && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 700, ml: 1 }}
                    onClick={e => { e.stopPropagation(); router.push(`/tournaments/${tournament.id}/live`); }}
                  >
                    נהל טורניר חי
                  </Button>
                )}
                {/* Edit and Delete icons */}
                {onEdit && (
                  <IconButton size="small" sx={{ color: '#222' }} onClick={e => { e.stopPropagation(); onEdit(tournament); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton size="small" sx={{ color: '#222' }} onClick={e => { e.stopPropagation(); onDelete(tournament); }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                מספר קבוצות: {tournament.settings?.numberOfTeams ?? '-'} | שחקנים בקבוצה: {tournament.settings?.playersPerTeam ?? '-'}
              </Typography>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
