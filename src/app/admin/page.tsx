'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  setDoc,
  doc,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import {
  ChevronLeft,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Dumbbell,
  Video,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useExercisesContext } from '@/context/ExercisesContext';
import { EXERCISES as DEFAULT_EXERCISES, type ExerciseCategory } from '@/types';
import type { PRRecord } from '@/types';

const ADMIN_EMAIL = 'aignat131@gmail.com';

const categoryOptions: { value: ExerciseCategory; label: string; unit: string }[] = [
  { value: 'reps', label: 'Reps', unit: 'reps' },
  { value: 'static', label: 'Static', unit: 'sec' },
  { value: 'weighted', label: 'Weighted', unit: 'kg' },
];

const categoryBadge: Record<ExerciseCategory, string> = {
  reps: 'bg-emerald-500/20 text-emerald-300',
  static: 'bg-cyan-500/20 text-cyan-300',
  weighted: 'bg-amber-500/20 text-amber-300',
};

type Tab = 'exercises' | 'review';

function formatScore(record: PRRecord): string {
  switch (record.category) {
    case 'reps':
      return `${record.score} reps`;
    case 'static':
      return `${record.score}s`;
    case 'weighted':
      return `+${record.addedWeightKg ?? record.score}kg`;
  }
}

function formatDate(ts: { seconds: number }): string {
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { exercises, refreshExercises } = useExercisesContext();
  const [activeTab, setActiveTab] = useState<Tab>('exercises');

  // Exercise management state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('reps');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Form review state
  const [videoRecords, setVideoRecords] = useState<PRRecord[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  const defaultIds = new Set(DEFAULT_EXERCISES.map((e) => e.id));

  // Load video records for form review
  const fetchVideoRecords = useCallback(async () => {
    setReviewLoading(true);
    try {
      const q = query(
        collection(getClientDb(), 'records'),
        orderBy('createdAt', 'desc'),
        limit(100),
      );
      const snap = await getDocs(q);
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PRRecord);
      setVideoRecords(all.filter((r) => r.videoUrl));
    } catch (err) {
      console.error('[Admin] Failed to fetch records:', err);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL && activeTab === 'review') {
      fetchVideoRecords();
    }
  }, [user, activeTab, fetchVideoRecords]);

  const handleAddExercise = async () => {
    const name = newName.trim();
    if (!name) {
      setAddError('Enter an exercise name.');
      return;
    }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (exercises.some((e) => e.id === id)) {
      setAddError('Exercise already exists.');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const option = categoryOptions.find((o) => o.value === newCategory)!;
      await addDoc(collection(getClientDb(), 'exercises'), {
        name,
        category: newCategory,
        unit: option.unit,
        createdAt: Timestamp.now(),
      });
      await refreshExercises();
      setNewName('');
    } catch (err) {
      setAddError('Failed to add exercise.');
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    try {
      if (defaultIds.has(exerciseId)) {
        // Hide default exercise by adding to config/exercises.hiddenIds
        await setDoc(
          doc(getClientDb(), 'config', 'exercises'),
          { hiddenIds: arrayUnion(exerciseId) },
          { merge: true },
        );
      } else {
        // Delete custom exercise from Firestore
        const snap = await getDocs(collection(getClientDb(), 'exercises'));
        const docToDelete = snap.docs.find((d) => d.id === exerciseId);
        if (docToDelete) {
          await deleteDoc(doc(getClientDb(), 'exercises', docToDelete.id));
        }
      }
      await refreshExercises();
    } catch (err) {
      console.error('[Admin] Failed to delete exercise:', err);
    }
  };

  const handleVerify = async (recordId: string, verified: boolean) => {
    try {
      await updateDoc(doc(getClientDb(), 'records', recordId), {
        formVerified: verified,
      });
      setVideoRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, formVerified: verified } : r)),
      );
    } catch (err) {
      console.error('[Admin] Failed to update verification:', err);
    }
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#09090b] max-w-lg mx-auto">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#09090b] px-6 max-w-lg mx-auto">
        <h1 className="mb-2 text-xl font-black text-white">Access Denied</h1>
        <p className="mb-6 text-sm text-white/50">
          This page is restricted to administrators.
        </p>
        <Link
          href="/"
          className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#09090b] pb-12 max-w-lg mx-auto">
      {/* Header */}
      <header className="px-5 pt-8 pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-white">Admin Hub</h1>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="flex gap-1.5 px-5 mt-3 mb-5">
        {([
          { id: 'exercises' as Tab, label: 'Exercises', icon: Dumbbell },
          { id: 'review' as Tab, label: 'Form Review', icon: Video },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Exercises Tab */}
      {activeTab === 'exercises' && (
        <section className="px-5 space-y-5">
          {/* Add exercise form */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Add Exercise</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Exercise name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ExerciseCategory)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {addError && (
              <p className="mt-2 text-xs text-red-400">{addError}</p>
            )}
            <button
              onClick={handleAddExercise}
              disabled={adding}
              className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>

          {/* Exercise list grouped by category */}
          {(['reps', 'static', 'weighted'] as ExerciseCategory[]).map((cat) => {
            const catExercises = exercises.filter((e) => e.category === cat);
            if (catExercises.length === 0) return null;
            return (
              <div key={cat}>
                <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryBadge[cat]}`}>
                  {cat}
                </span>
                <div className="mt-2 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  {catExercises.map((ex) => {
                    const isDefault = defaultIds.has(ex.id);
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-sm text-white/90">{ex.name}</span>
                        <button
                          onClick={() => handleDeleteExercise(ex.id)}
                          className="rounded-full p-1.5 text-white/20 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Form Review Tab */}
      {activeTab === 'review' && (
        <section className="px-5">
          {reviewLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : videoRecords.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-white/40">No video submissions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {videoRecords.map((record) => (
                <div
                  key={record.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    record.formVerified === true
                      ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                      : record.formVerified === false
                        ? 'border-red-500/20 bg-red-500/[0.03]'
                        : 'border-white/[0.08] bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {record.userAvatar ? (
                      <img
                        src={record.userAvatar}
                        alt={record.username}
                        className="h-8 w-8 rounded-full ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                        {record.username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/90 truncate">
                          {record.username}
                        </span>
                        {record.gender && (
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-white/40">
                            {record.gender === 'male' ? 'M' : 'F'}
                          </span>
                        )}
                        {record.formVerified === true && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        {record.formVerified === false && (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                      </div>
                      <p className="text-xs text-white/40">
                        {record.exerciseName} &middot; {formatScore(record)}
                        {record.createdAt && ` · ${formatDate(record.createdAt)}`}
                      </p>
                    </div>

                    {/* Video link */}
                    <a
                      href={record.videoUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-full bg-white/[0.06] p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  {/* Verify / Reject buttons */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleVerify(record.id!, true)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                        record.formVerified === true
                          ? 'bg-emerald-500 text-black'
                          : 'bg-white/[0.06] text-white/40 hover:bg-emerald-500/20 hover:text-emerald-300'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Good Form
                    </button>
                    <button
                      onClick={() => handleVerify(record.id!, false)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                        record.formVerified === false
                          ? 'bg-red-500 text-white'
                          : 'bg-white/[0.06] text-white/40 hover:bg-red-500/20 hover:text-red-300'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Bad Form
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
