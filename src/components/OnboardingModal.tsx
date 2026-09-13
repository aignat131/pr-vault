'use client';

import { useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { useExercises } from '@/context/ExercisesContext';
import { useEscapeClose } from '@/lib/useEscapeClose';
import type { ExerciseCategory } from '@/types';
import { categoryStyle } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/constants';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const SUGGESTED_FAVORITES = [
  'pull-ups',
  'muscle-ups',
  'dips',
  'handstand-hold',
  'front-lever',
  'weighted-pull-ups',
];

export default function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const exercises = useExercises();
  useEscapeClose(open, onComplete);
  const [selected, setSelected] = useState<Set<string>>(new Set(SUGGESTED_FAVORITES));

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([...selected]));
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    onComplete();
  };

  const categories: ExerciseCategory[] = ['reps', 'static', 'weighted'];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" />

      {/* Centered modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-3xl border border-white/[0.08] bg-zinc-900/95 px-6 pb-6 pt-8 shadow-2xl backdrop-blur-2xl">
          {/* Welcome header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-8 w-8 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 0 0-6-6 6 6 0 0 0-6 6c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-white">Welcome to PR Vault</h2>
            <p className="mt-2 text-sm text-white/50">
              Pick your favorite exercises to personalize your leaderboard
            </p>
          </div>

          {/* Exercise list grouped by category */}
          <div className="space-y-4">
            {categories.map((cat) => {
              const catExercises = exercises.filter((e) => e.category === cat);
              return (
                <div key={cat}>
                  <span
                    className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryStyle[cat].badge}`}
                  >
                    {categoryStyle[cat].label}
                  </span>
                  <div className="mt-2 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                    {catExercises.map((ex) => {
                      const isSel = selected.has(ex.id);
                      return (
                        <button
                          key={ex.id}
                          onClick={() => toggle(ex.id)}
                          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.04]"
                        >
                          <span className="text-sm text-white/90">{ex.name}</span>
                          <Star
                            className={`h-4 w-4 transition-colors ${
                              isSel
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-white/20'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Get Started button */}
          <button
            onClick={handleComplete}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-black transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            Get Started
            <ChevronRight className="h-4 w-4" />
          </button>

          <p className="mt-3 text-center text-[10px] text-white/30">
            You can change these later in the leaderboard settings
          </p>
        </div>
      </div>
    </>
  );
}
