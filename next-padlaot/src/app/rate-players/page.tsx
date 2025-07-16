'use client';
import { Suspense } from 'react';
import RatePlayersContent from './RatePlayersContent';

export default function RatePlayersPage() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <RatePlayersContent />
    </Suspense>
  );
} 