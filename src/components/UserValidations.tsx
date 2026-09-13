'use client';

import { useState } from 'react';
import { ChevronDown, ShieldCheck, Clock, XCircle, ExternalLink } from 'lucide-react';
import { categoryStyle, formatScore, useWeightUnit } from '@/lib/utils';
import type { ValidationRequest, PRRecord } from '@/types';

interface UserValidationsProps {
  validations: ValidationRequest[];
}

export default function UserValidations({ validations }: UserValidationsProps) {
  const [expanded, setExpanded] = useState(false);
  const weightUnit = useWeightUnit();

  if (validations.length === 0) return null;

  const pending = validations.filter((v) => v.status === 'pending');
  const approved = validations.filter((v) => v.status === 'approved');
  const rejected = validations.filter((v) => v.status === 'rejected');

  return (
    <section className="px-5 mb-6 md:px-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between py-2"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
            My Validations
          </h3>
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-black">
              {pending.length}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/30 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-4">
          {/* Pending */}
          {pending.length > 0 && (
            <ValidationGroup label="Pending" items={pending} weightUnit={weightUnit} />
          )}
          {/* Approved */}
          {approved.length > 0 && (
            <ValidationGroup label="Approved" items={approved} weightUnit={weightUnit} />
          )}
          {/* Rejected */}
          {rejected.length > 0 && (
            <ValidationGroup label="Rejected" items={rejected} weightUnit={weightUnit} />
          )}
        </div>
      )}
    </section>
  );
}

function ValidationGroup({
  label,
  items,
  weightUnit,
}: {
  label: string;
  items: ValidationRequest[];
  weightUnit: 'kg' | 'lbs';
}) {
  const statusConfig = {
    Pending: { icon: Clock, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/[0.03]' },
    Approved: { icon: ShieldCheck, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.03]' },
    Rejected: { icon: XCircle, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/[0.03]' },
  }[label]!;

  const Icon = statusConfig.icon;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusConfig.color}`}>
          {label} ({items.length})
        </span>
      </div>
      <div className={`rounded-2xl border ${statusConfig.border} ${statusConfig.bg} divide-y divide-white/[0.06]`}>
        {items.map((item) => {
          const style = categoryStyle[item.category];
          return (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/90 truncate">{item.exerciseName}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${style.badge}`}>
                    {style.label}
                  </span>
                </div>
                {item.reviewNote && (
                  <p className="mt-0.5 text-[10px] text-red-400/70 italic">{item.reviewNote}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${style.accent}`}>
                  {formatScore(
                    { score: item.score, category: item.category, addedWeightKg: item.addedWeightKg ?? undefined } as PRRecord,
                    weightUnit,
                  )}
                </span>
                <a
                  href={item.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                  aria-label="View video proof"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
