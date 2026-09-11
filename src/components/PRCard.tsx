'use client';

import { ExternalLink, Share2 } from 'lucide-react';
import type { PRRecord } from '@/types';
import { categoryStyle, formatScoreUpper as formatScoreDisplay, formatScore, formatDate } from '@/lib/utils';

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
      {/* Category indicator dot + NEW badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        {record.isNewPR && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
            New
          </span>
        )}
        <div className={`h-2 w-2 rounded-full ${style.dot}`} />
      </div>

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
        {formatScoreDisplay(record)}
      </p>

      {/* Category badge + actions */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
        >
          {record.category}
        </span>

        <div className="flex items-center gap-1.5">
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
          <button
            onClick={() => {
              const text = `${record.username} hit ${formatScore(record)} on ${record.exerciseName}!`;
              if (navigator.share) {
                navigator.share({ text }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text);
              }
            }}
            className="rounded-full bg-white/5 p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            <Share2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
