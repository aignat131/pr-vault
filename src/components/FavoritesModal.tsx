'use client';

import { X, Star } from 'lucide-react';
import { useExercises } from '@/context/ExercisesContext';
import { useEscapeClose } from '@/lib/useEscapeClose';
import type { ExerciseCategory } from '@/types';
import { categoryStyle } from '@/lib/utils';

interface FavoritesModalProps {
  open: boolean;
  onClose: () => void;
  favorites: Set<string>;
  onToggle: (exerciseId: string) => void;
}

export default function FavoritesModal({ open, onClose, favorites, onToggle }: FavoritesModalProps) {
  const exercises = useExercises();
  useEscapeClose(open, onClose);
  if (!open) return null;

  const categories: ExerciseCategory[] = ['reps', 'static', 'weighted'];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up max-w-2xl mx-auto">
        <div className="max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-white/[0.08] bg-zinc-900/95 px-6 pb-10 pt-4 shadow-2xl backdrop-blur-2xl">
          {/* Drag handle */}
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Manage Exercises</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-5 text-xs text-white/40">
            Star exercises to pin them at the top of the leaderboard tabs.
          </p>

          {/* Exercise list grouped by category */}
          <div className="space-y-5">
            {categories.map((cat) => {
              const catExercises = exercises.filter((e) => e.category === cat);
              return (
                <div key={cat}>
                  <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryStyle[cat].badge}`}>
                    {categoryStyle[cat].label}
                  </span>
                  <div className="mt-2 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                    {catExercises.map((ex) => {
                      const isFav = favorites.has(ex.id);
                      return (
                        <button
                          key={ex.id}
                          onClick={() => onToggle(ex.id)}
                          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.04]"
                        >
                          <span className="text-sm text-white/90">{ex.name}</span>
                          <Star
                            className={`h-4 w-4 transition-colors ${
                              isFav
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
        </div>
      </div>
    </>
  );
}
