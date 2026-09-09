'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useExercises } from '@/context/ExercisesContext';
import type { Exercise } from '@/types';

interface AddPRModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddPRModal({ open, onClose }: AddPRModalProps) {
  const { user } = useAuth();
  const exercises = useExercises();
  const [selectedExercise, setSelectedExercise] = useState<Exercise>(exercises[0]);
  const [score, setScore] = useState('');
  const [addedWeight, setAddedWeight] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setScore('');
      setAddedWeight('');
      setVideoUrl('');
      setError('');
      setSelectedExercise(exercises[0]);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    console.log('[AddPR] handleSubmit called');
    console.log('[AddPR] user:', user?.uid, user?.email);
    console.log('[AddPR] score:', score, 'exercise:', selectedExercise.id);

    if (!user) {
      setError('You must be logged in to add a PR.');
      console.log('[AddPR] No user, aborting');
      return;
    }

    const numScore = Number(score);
    if (!score || isNaN(numScore) || numScore <= 0) {
      setError('Enter a valid score.');
      console.log('[AddPR] Invalid score, aborting');
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

      // 1 new exercise per day limit: if this is a NEW exercise (no existing record),
      // check if user already created a PR for a different exercise today
      if (existingSnap.empty) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayQuery = query(
          collection(getClientDb(), 'records'),
          where('userId', '==', user.uid),
          where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
        );
        const todaySnap = await getDocs(todayQuery);
        const newPRsToday = todaySnap.docs.filter(
          (d) => d.data().exerciseId !== selectedExercise.id,
        );
        if (newPRsToday.length > 0) {
          setError('You already set a new PR today. Come back tomorrow!');
          setLoading(false);
          return;
        }
      }

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        const existingScore = existingDoc.data().score as number;

        if (numScore <= existingScore) {
          setError(`New score must beat your current PR of ${existingScore}.`);
          setLoading(false);
          return;
        }

        // Read user gender from localStorage
        const userGender = localStorage.getItem('pr-vault-user-gender') || null;

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
        // Read user gender from localStorage
        const userGender = localStorage.getItem('pr-vault-user-gender') || null;

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
          createdAt: Timestamp.now(),
        });
      }

      onClose();
    } catch (err) {
      console.error('[AddPR] Firestore write failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save PR.');
    } finally {
      setLoading(false);
    }
  }, [user, score, addedWeight, videoUrl, selectedExercise, onClose]);

  if (!open) return null;

  const scoreLabel =
    selectedExercise.category === 'reps'
      ? 'Reps'
      : selectedExercise.category === 'static'
        ? 'Seconds'
        : 'Total weight (kg)';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up max-w-lg mx-auto">
        <div className="rounded-t-3xl border-t border-white/[0.08] bg-zinc-900/95 px-6 pb-10 pt-4 shadow-2xl backdrop-blur-2xl">
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

          {/* Exercise selector */}
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
              Exercise
            </span>
            <div className="relative">
              <select
                value={selectedExercise.id}
                onChange={(e) => {
                  const ex = exercises.find((x) => x.id === e.target.value);
                  if (ex) setSelectedExercise(ex);
                }}
                className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-10 text-sm text-white outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-zinc-900 text-white">
                    {ex.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            </div>
          </label>

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
