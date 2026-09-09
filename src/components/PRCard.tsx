'use client';

import { ExternalLink } from 'lucide-react';
import type { PRRecord } from '@/types';

// Category-based accent colors
const categoryStyle = {
  reps: {
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  static: {
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/10',
    accent: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300',
    dot: 'bg-cyan-400',
  },
  weighted: {
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
    accent: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    dot: 'bg-amber-400',
  },
} as const;

function formatScore(record: PRRecord): string {
  switch (record.category) {
    case 'reps':
      return `${record.score} REPS`;
    case 'static':
      return `${record.score}s`;
    case 'weighted':
      return `+${record.addedWeightKg ?? record.score}kg`;
  }
}

function formatDate(timestamp: { seconds: number }): string {
  return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface PRCardProps {
  record: PRRecord;
}

export default function PRCard({ record }: PRCardProps) {
  const style = categoryStyle[record.category];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border ${style.border}
        bg-white/[0.03] backdrop-blur-xl p-4
        shadow-lg ${style.glow}
        transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.06]
      `}
    >
      {/* Category indicator dot */}
      <div className={`absolute top-4 right-4 h-2 w-2 rounded-full ${style.dot}`} />

      {/* Header: user info */}
      <div className="flex items-center gap-3 mb-3">
        {record.userAvatar ? (
          <img
            src={record.userAvatar}
            alt={record.username}
            className="h-8 w-8 rounded-full ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70">
            {record.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">
            {record.username}
          </p>
          <p className="text-xs text-white/40">
            {record.createdAt && formatDate(record.createdAt)}
          </p>
        </div>
      </div>

      {/* Exercise name */}
      <p className="text-xs font-medium uppercase tracking-wider text-white/50 mb-1">
        {record.exerciseName}
      </p>

      {/* Score */}
      <p className={`text-3xl font-black tracking-tight ${style.accent}`}>
        {formatScore(record)}
      </p>

      {/* Category badge + video proof */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
        >
          {record.category}
        </span>

        {record.videoUrl && (
          <a
            href={record.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
          >
            <ExternalLink className="h-3 w-3" />
            Proof
          </a>
        )}
      </div>
    </div>
  );
}
