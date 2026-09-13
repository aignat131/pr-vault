'use client';

import { useState } from 'react';
import {
  Footprints, Target, Flame, Zap, Crown, Timer, Dumbbell,
  ShieldCheck, Shield, Layers,
} from 'lucide-react';
import { BADGES, evaluateBadges, type Badge } from '@/lib/badges';
import type { PRRecord } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  Footprints, Target, Flame, Zap, Crown, Timer, Dumbbell,
  ShieldCheck, Shield, Layers,
};

interface BadgeRowProps {
  records: PRRecord[];
}

export default function BadgeRow({ records }: BadgeRowProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const earned = new Set(evaluateBadges(records));

  if (records.length === 0) return null;

  return (
    <section className="px-5 mb-6 md:px-8">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
        Badges ({earned.size}/{BADGES.length})
      </h3>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {BADGES.map((badge) => {
          const Icon = iconMap[badge.icon] ?? Flame;
          const isEarned = earned.has(badge.id);
          return (
            <button
              key={badge.id}
              onClick={() => setSelectedBadge(selectedBadge?.id === badge.id ? null : badge)}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                isEarned
                  ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.02] opacity-40'
              }`}
              aria-label={`${badge.name}: ${badge.desc}${isEarned ? ' (earned)' : ''}`}
            >
              <Icon className={`h-5 w-5 ${isEarned ? 'text-emerald-400' : 'text-white/30'}`} />
              <span className={`text-[9px] font-semibold ${isEarned ? 'text-white/80' : 'text-white/25'}`}>
                {badge.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tooltip */}
      {selectedBadge && (
        <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5">
          <p className="text-sm font-medium text-white/90">{selectedBadge.name}</p>
          <p className="text-xs text-white/50">{selectedBadge.desc}</p>
          {earned.has(selectedBadge.id) ? (
            <p className="mt-0.5 text-[10px] font-semibold text-emerald-400">Earned</p>
          ) : (
            <p className="mt-0.5 text-[10px] text-white/30">Not yet earned</p>
          )}
        </div>
      )}
    </section>
  );
}
