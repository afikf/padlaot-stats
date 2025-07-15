import React, { useMemo } from 'react';
import { Box, Autocomplete, TextField, Select, MenuItem, InputLabel, FormControl, InputAdornment, IconButton } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ClearIcon from '@mui/icons-material/Clear';
import dayjs, { Dayjs } from 'dayjs';

interface PlayerOption {
  id: string;
  name: string;
}

interface GameNightOption {
  date: string; // ISO string
}

interface DashboardSearchBarProps {
  players: PlayerOption[];
  gameNights: GameNightOption[];
  onFilterChange: (filters: { playerId?: string; month?: string; date?: string }) => void;
}

export default function DashboardSearchBar({ players, gameNights, onFilterChange }: DashboardSearchBarProps) {
  const [player, setPlayer] = React.useState<PlayerOption | null>(null);
  const [month, setMonth] = React.useState<string>('');
  const [date, setDate] = React.useState<Dayjs | null>(null);

  // Extract unique months from gameNights
  const months = useMemo(() => {
    const uniqueMonths = new Set<string>();
    gameNights.forEach(night => {
      if (night.date) {
        const d = dayjs(night.date);
        uniqueMonths.add(d.format('YYYY-MM'));
      }
    });
    // Sort descending (newest first)
    return Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
  }, [gameNights]);

  // Map month value to display string
  const monthDisplay = (month: string) => {
    if (!month) return '';
    const d = dayjs(month + '-01');
    return d.format('MMMM YYYY'); // e.g., "ינואר 2024"
  };

  // Handle filter changes
  React.useEffect(() => {
    onFilterChange({
      playerId: player?.id,
      month,
      date: date ? date.format('YYYY-MM-DD') : undefined,
    });
    // eslint-disable-next-line
  }, [player, month, date]);

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      {/* Player autocomplete */}
      <Autocomplete
        options={players}
        getOptionLabel={(option) => option.name}
        value={player}
        onChange={(_, newValue) => setPlayer(newValue)}
        sx={{ minWidth: 200, flex: 1 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="חפש שחקן"
            variant="outlined"
          />
        )}
        isOptionEqualToValue={(option, value) => option.id === value.id}
      />
      {/* Month dropdown */}
      <FormControl sx={{ minWidth: 160 }}>
        <InputLabel id="month-select-label">חודש</InputLabel>
        <Select
          labelId="month-select-label"
          value={month}
          label="חודש"
          onChange={(e) => setMonth(e.target.value)}
        >
          <MenuItem value=""><em>הכל</em></MenuItem>
          {months.map((m) => (
            <MenuItem key={m} value={m}>{monthDisplay(m)}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Date picker */}
      <DatePicker
        label="תאריך"
        value={date}
        onChange={setDate}
        slotProps={{
          textField: {
            variant: 'outlined',
            InputProps: date ? {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setDate(null)}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            } : {},
          }
        }}
        format="DD/MM/YYYY"
      />
    </Box>
  );
} 