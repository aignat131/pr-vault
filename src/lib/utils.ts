import type { PRRecord, ExerciseCategory } from '@/types';

export function formatScore(record: PRRecord): string {
  switch (record.category) {
    case 'reps':
      return `${record.score} reps`;
    case 'static':
      return `${record.score} sec`;
    case 'weighted':
      return `+${record.addedWeightKg ?? record.score}kg`;
  }
}

export function formatScoreUpper(record: PRRecord): string {
  switch (record.category) {
    case 'reps':
      return `${record.score} REPS`;
    case 'static':
      return `${record.score} SEC`;
    case 'weighted':
      return `+${record.addedWeightKg ?? record.score}kg`;
  }
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
