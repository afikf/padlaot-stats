import React, { useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Box, Typography, Chip, Button, Tabs, Tab, Divider, Stack } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface LiveEventAccordionProps {
  date: string;
  badgeLabel: string;
  badgeColor: string;
  buttonLabel: string;
  onButtonClick: (e: React.MouseEvent) => void;
  buttonSx?: any;
  summarySx?: any;
  borderColor?: string;
  summaryBackground?: string;
  tabLabels: string[];
  renderTabContent: (tabIdx: number) => React.ReactNode;
  defaultTab?: number;
}

export default function LiveEventAccordion({
  date,
  badgeLabel,
  badgeColor,
  buttonLabel,
  onButtonClick,
  buttonSx = {},
  summarySx = {},
  borderColor = '#2563eb',
  summaryBackground = undefined,
  tabLabels,
  renderTabContent,
  defaultTab = 0,
}: LiveEventAccordionProps) {
  const [tab, setTab] = useState(defaultTab);

  return (
    <Accordion
      sx={{
        mb: 2,
        borderRadius: 2,
        border: `2px solid ${borderColor}`,
        boxShadow: 4,
      }}
      defaultExpanded
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: summaryBackground, color: summaryBackground ? '#fff' : undefined }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', ...summarySx }}>
          <Typography fontWeight={600}>{date}</Typography>
          <Chip
            label={badgeLabel}
            size="small"
            variant="filled"
            sx={{ fontWeight: 700, bgcolor: badgeColor, color: '#fff' }}
          />
          <Button
            variant="contained"
            sx={{ ml: 'auto', fontWeight: 700, fontSize: 16, px: 4, ...buttonSx }}
            onClick={onButtonClick}
          >
            {buttonLabel}
          </Button>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ width: '100%' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            {tabLabels.map((label, idx) => (
              <Tab key={label} label={label} />
            ))}
          </Tabs>
          {renderTabContent(tab)}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
} 