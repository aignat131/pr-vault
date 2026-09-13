import { useState, useEffect } from 'react';
import type { PRRecord, ExerciseCategory, WeightUnit } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462);
}

export function formatScore(record: PRRecord, weightUnit: WeightUnit = 'kg'): string {
  switch (record.category) {
    case 'reps':
      return `${record.score} reps`;
    case 'static':
      return `${record.score} sec`;
    case 'weighted': {
      const val = record.addedWeightKg ?? record.score;
      return weightUnit === 'lbs' ? `+${kgToLbs(val)}lbs` : `+${val}kg`;
    }
  }
}

export function formatScoreUpper(record: PRRecord, weightUnit: WeightUnit = 'kg'): string {
  switch (record.category) {
    case 'reps':
      return `${record.score} REPS`;
    case 'static':
      return `${record.score} SEC`;
    case 'weighted': {
      const val = record.addedWeightKg ?? record.score;
      return weightUnit === 'lbs' ? `+${kgToLbs(val)}lbs` : `+${val}kg`;
    }
  }
}

export function useWeightUnit(): WeightUnit {
  const [unit, setUnit] = useState<WeightUnit>('kg');
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.WEIGHT_UNIT);
    if (stored === 'lbs') setUnit('lbs');
    const handler = () => {
      const v = localStorage.getItem(STORAGE_KEYS.WEIGHT_UNIT);
      setUnit(v === 'lbs' ? 'lbs' : 'kg');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);
  return unit;
}

export function formatDate(timestamp: { seconds: number }): string {
  return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateFull(timestamp: { seconds: number }): string {
  return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const categoryStyle: Record<
  ExerciseCategory,
  {
    border: string;
    glow: string;
    accent: string;
    badge: string;
    dot: string;
    label: string;
  }
> = {
  reps: {
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
    dot: 'bg-emerald-400',
    label: 'Reps',
  },
  static: {
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/10',
    accent: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300',
    dot: 'bg-cyan-400',
    label: 'Static',
  },
  weighted: {
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
    accent: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    dot: 'bg-amber-400',
    label: 'Weighted',
  },
} as const;
