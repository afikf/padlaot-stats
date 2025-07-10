'use client';

import { useState } from 'react';
import {
  HomeIcon,
  UserIcon,
  CogIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/layout/Card';
import { Grid } from '@/components/ui/layout/Grid';
import { Flex } from '@/components/ui/layout/Flex';
import { Paper } from '@/components/ui/layout/Paper';
import { Divider } from '@/components/ui/layout/Divider';
import { Typography } from '@/components/ui/Typography';
import { Navbar } from '@/components/ui/navigation/Navbar';
import { Breadcrumbs } from '@/components/ui/navigation/Breadcrumbs';
import { Tabs } from '@/components/ui/navigation/Tabs';
import { Container } from '@/components/ui/Container';
import { type UserRole } from '@/lib/firebase/users';
import { type NavItem } from '@/types/navigation';

// Example navigation items
const navItems: NavItem[] = [
  { label: 'דשבורד', href: '/dashboard', icon: HomeIcon },
  { label: 'שחקנים', href: '/players', icon: UserIcon },
  { label: 'סטטיסטיקות', href: '/stats', icon: ChartBarIcon },
  { label: 'הגדרות', href: '/settings', icon: CogIcon, roles: ['admin' as UserRole] },
];

// Example breadcrumbs
const breadcrumbs = [
  { label: 'דשבורד', href: '/dashboard' },
  { label: 'דוגמאות UI', href: '/ui-examples' },
  { label: 'רכיבים' },
];

// Example tabs
const tabs = [
  { label: 'פרטים', value: 'details' },
  { label: 'סטטיסטיקות', value: 'stats', icon: ChartBarIcon },
  { label: 'מסמכים', value: 'documents', icon: DocumentTextIcon },
];

export default function UIExamplesPage() {
  const [filledTabValue, setFilledTabValue] = useState('details');
  const [outlinedTabValue, setOutlinedTabValue] = useState('stats');

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation Examples */}
      <Navbar items={navItems} />
      
      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        <Typography variant="h1" className="mb-8">
          דוגמאות רכיבי UI
        </Typography>

        {/* Layout Components */}
        <section className="mb-12">
          <Typography variant="h2" className="mb-6">
            רכיבי Layout
          </Typography>

          {/* Cards */}
          <Typography variant="h3" className="mb-4">
            Cards
          </Typography>
          <Grid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md" className="mb-8">
            <Card variant="elevated" padding="md">
              <Typography variant="h4">כרטיס מוגבה</Typography>
              <Typography>תוכן הכרטיס עם צל</Typography>
            </Card>
            <Card variant="outlined" padding="md">
              <Typography variant="h4">כרטיס עם מסגרת</Typography>
              <Typography>תוכן הכרטיס עם מסגרת</Typography>
            </Card>
            <Card variant="flat" padding="md">
              <Typography variant="h4">כרטיס שטוח</Typography>
              <Typography>תוכן הכרטיס ללא הדגשה</Typography>
            </Card>
          </Grid>

          {/* Papers */}
          <Typography variant="h3" className="mb-4">
            Papers
          </Typography>
          <Grid cols={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md" className="mb-8">
            <Paper elevation={0} padding="md">
              <Typography>ללא הגבהה</Typography>
            </Paper>
            <Paper elevation={1} padding="md">
              <Typography>הגבהה נמוכה</Typography>
            </Paper>
            <Paper elevation={2} padding="md">
              <Typography>הגבהה בינונית</Typography>
            </Paper>
            <Paper elevation={4} padding="md" hover>
              <Typography>הגבהה גבוהה עם hover</Typography>
            </Paper>
          </Grid>

          {/* Flex Examples */}
          <Typography variant="h3" className="mb-4">
            Flex Layouts
          </Typography>
          <Grid cols={{ mobile: 1, tablet: 2 }} gap="md" className="mb-8">
            <Paper padding="md">
              <Typography variant="h4" className="mb-2">Row with Space Between</Typography>
              <Flex justify="between" align="center" className="h-12 bg-neutral-100 rounded">
                <div className="bg-primary-200 p-2 rounded">פריט 1</div>
                <div className="bg-primary-200 p-2 rounded">פריט 2</div>
                <div className="bg-primary-200 p-2 rounded">פריט 3</div>
              </Flex>
            </Paper>
            <Paper padding="md">
              <Typography variant="h4" className="mb-2">Column with Gap</Typography>
              <Flex direction="col" gap="md" className="bg-neutral-100 p-4 rounded">
                <div className="bg-primary-200 p-2 rounded">פריט 1</div>
                <div className="bg-primary-200 p-2 rounded">פריט 2</div>
                <div className="bg-primary-200 p-2 rounded">פריט 3</div>
              </Flex>
            </Paper>
          </Grid>

          {/* Dividers */}
          <Typography variant="h3" className="mb-4">
            Dividers
          </Typography>
          <Paper padding="md" className="mb-8">
            <Typography>תוכן מעל</Typography>
            <Divider spacing="md" />
            <Typography>תוכן באמצע</Typography>
            <Divider variant="dashed" color="dark" spacing="md" />
            <Typography>תוכן מתחת</Typography>
          </Paper>
        </section>

        {/* Navigation Components */}
        <section className="mb-12">
          <Typography variant="h2" className="mb-6">
            רכיבי ניווט
          </Typography>

          {/* Tabs Examples */}
          <Typography variant="h3" className="mb-4">
            Tabs
          </Typography>
          <Grid cols={{ mobile: 1 }} gap="md" className="mb-8">
            <Paper padding="md">
              <Typography variant="h4" className="mb-4">Filled Tabs</Typography>
              <Tabs
                items={tabs}
                value={filledTabValue}
                onChange={setFilledTabValue}
                variant="filled"
                className="mb-4"
              />
              
              <Typography variant="h4" className="mb-4">Outlined Tabs</Typography>
              <Tabs
                items={tabs}
                value={outlinedTabValue}
                onChange={setOutlinedTabValue}
                variant="outlined"
                fullWidth
              />
            </Paper>
          </Grid>
        </section>

        {/* Typography Examples */}
        <section>
          <Typography variant="h2" className="mb-6">
            טיפוגרפיה
          </Typography>
          <Paper padding="lg">
            <Typography variant="h1">כותרת ראשית (h1)</Typography>
            <Typography variant="h2">כותרת משנית (h2)</Typography>
            <Typography variant="h3">כותרת שלישית (h3)</Typography>
            <Typography variant="h4">כותרת רביעית (h4)</Typography>
            <Typography variant="h5">כותרת חמישית (h5)</Typography>
            <Typography variant="h6">כותרת שישית (h6)</Typography>
            <Divider spacing="md" />
            <Typography variant="base">
              טקסט רגיל בגודל בסיסי. מיועד לפסקאות ותוכן טקסטואלי ארוך.
              זוהי דוגמה לפסקה עם מספר שורות כדי להדגים את הריווח
              ואת זרימת הטקסט.
            </Typography>
            <Typography variant="sm" className="mt-4">
              טקסט קטן יותר, מתאים להערות ומידע משני.
            </Typography>
            <Typography variant="lg" className="mt-4">
              טקסט גדול יותר, לתוכן מודגש או חשוב.
            </Typography>
            <Typography className="mt-4 ltr-nums">
              מספרים בכיוון LTR: 12345
            </Typography>
          </Paper>
        </section>
      </Container>
    </div>
  );
} 