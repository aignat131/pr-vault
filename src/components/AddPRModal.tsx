'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useExercises } from '@/context/ExercisesContext';
import { STORAGE_KEYS } from '@/lib/constants';
import { categoryStyle } from '@/lib/utils';
import confetti from 'canvas-confetti';
import type { Exercise } from '@/types';

interface AddPRModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  gender?: string | null;
  defaultExerciseId?: string;
}

export default function AddPRModal({ open, onClose, onSave, gender: genderProp, defaultExerciseId }: AddPRModalProps) {
  const { user } = useAuth();
  const exercises = useExercises();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [score, setScore] = useState('');
  const [addedWeight, setAddedWeight] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setScore('');
      setAddedWeight('');
      setVideoUrl('');
      setError('');
      setSearch('');
      // Use defaultExerciseId if provided, otherwise first exercise
      const defaultEx = defaultExerciseId
        ? exercises.find((e) => e.id === defaultExerciseId)
        : null;
      setSelectedExercise(defaultEx ?? exercises[0] ?? null);
    }
  }, [open, exercises, defaultExerciseId]);

  const filteredExercises = useMemo(() => {
    if (!search.trim()) return exercises;
    const q = search.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, search]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to add a PR.');
      return;
    }

    if (!selectedExercise) {
      setError('No exercises available.');
      return;
    }

    const numScore = Number(score);
    if (!score || isNaN(numScore) || numScore <= 0) {
      setError('Enter a valid score.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user already has a PR for this exercise
      const existingQuery = query(
        collection(getClientDb(), 'records'),
        where('userId', '==', user.uid),
        where('exerciseId', '==', selectedExercise.id),
      );
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        const existingScore = existingDoc.data().score as number;

        if (numScore <= existingScore) {
          setError(`New score must beat your current PR of ${existingScore}.`);
          setLoading(false);
          return;
        }

        const userGender = genderProp ?? localStorage.getItem(STORAGE_KEYS.GENDER) ?? null;

        // Update existing record
        await updateDoc(doc(getClientDb(), 'records', existingDoc.id), {
          score: numScore,
          addedWeightKg:
            selectedExercise.category === 'weighted' && addedWeight
              ? Number(addedWeight)
              : null,
          videoUrl: videoUrl.trim() || null,
          gender: userGender,
          createdAt: Timestamp.now(),
        });
      } else {
        const userGender = genderProp ?? localStorage.getItem(STORAGE_KEYS.GENDER) ?? null;

        // Create new record
        await addDoc(collection(getClientDb(), 'records'), {
          userId: user.uid,
          username: user.displayName ?? 'Anonymous',
          userAvatar: user.photoURL ?? null,
          exerciseId: selectedExercise.id,
          exerciseName: selectedExercise.name,
          category: selectedExercise.category,
          score: numScore,
          addedWeightKg:
            selectedExercise.category === 'weighted' && addedWeight
              ? Number(addedWeight)
              : null,
          videoUrl: videoUrl.trim() || null,
          gender: userGender,
          isNewPR: true,
          createdAt: Timestamp.now(),
        });
      }

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onSave?.();
      onClose();
    } catch (err) {
      console.error('[AddPR] Firestore write failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save PR.');
    } finally {
      setLoading(false);
    }
  }, [user, score, addedWeight, videoUrl, selectedExercise, onClose, onSave, genderProp]);

  if (!open) return null;
  if (!selectedExercise) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up max-w-2xl mx-auto">
          <div className="rounded-t-3xl border-t border-white/[0.08] bg-zinc-900/95 px-6 pb-10 pt-4 shadow-2xl backdrop-blur-2xl text-center">
            <p className="py-8 text-sm text-white/50">No exercises available.</p>
          </div>
        </div>
      </>
    );
  }

  const scoreLabel =
    selectedExercise.category === 'reps'
      ? 'Reps'
      : selectedExercise.category === 'static'
        ? 'Seconds'
        : 'Total weight (kg)';

  const style = categoryStyle[selectedExercise.category];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up max-w-2xl mx-auto">
        <div className="max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-white/[0.08] bg-zinc-900/95 px-6 pb-10 pt-4 shadow-2xl backdrop-blur-2xl">
          {/* Drag handle */}
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">New Personal Record</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Exercise selector with search */}
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
              Exercise
            </span>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.02] scrollbar-hide">
              {filteredExercises.map((ex) => {
                const active = selectedExercise.id === ex.id;
                const exStyle = categoryStyle[ex.category];
                return (
                  <button
                    key={ex.id}
                    onClick={() => { setSelectedExercise(ex); setSearch(''); }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-emerald-500/10 text-white'
                        : 'text-white/70 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{ex.name}</span>
                    <span className={`text-[10px] font-medium uppercase ${exStyle.accent}`}>
                      {exStyle.label}
                    </span>
                  </button>
                );
              })}
              {filteredExercises.length === 0 && (
                <p className="px-4 py-3 text-sm text-white/30">No exercises found</p>
              )}
            </div>
          </label>

          {/* Selected exercise indicator */}
          <div className={`mb-4 flex items-center gap-2 rounded-xl border ${style.border} bg-white/[0.02] px-4 py-2.5`}>
            <div className={`h-2 w-2 rounded-full ${style.dot}`} />
            <span className="text-sm font-medium text-white">{selectedExercise.name}</span>
            <span className={`ml-auto text-[10px] font-semibold uppercase ${style.accent}`}>{style.label}</span>
          </div>

          {/* Score input */}
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
              {scoreLabel}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={selectedExercise.category === 'weighted' ? 0.5 : 1}
              placeholder={
                selectedExercise.category === 'reps'
                  ? 'e.g. 12'
                  : selectedExercise.category === 'static'
                    ? 'e.g. 48'
                    : 'e.g. 100'
              }
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
          </label>

          {/* Added weight (weighted exercises only) */}
          {selectedExercise.category === 'weighted' && (
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                Added Weight (+kg)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                placeholder="e.g. 20"
                value={addedWeight}
                onChange={(e) => setAddedWeight(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              />
            </label>
          )}

          {/* Video proof URL */}
          <label className="mb-6 block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
              Video Proof URL (optional)
            </span>
            <input
              type="url"
              placeholder="https://youtube.com/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
          </label>

          {/* Error message */}
          {error && (
            <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-black transition-all duration-200 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-emerald-500"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save PR'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
