'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Flame, Zap, TrendingUp, Timer, ChevronDown, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useExercises } from '@/context/ExercisesContext';
import PRCard from '@/components/PRCard';
import BottomNav from '@/components/BottomNav';
import AddPRModal from '@/components/AddPRModal';
import OnboardingModal from '@/components/OnboardingModal';
import type { PRRecord } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';
import { categoryStyle, formatScoreUpper, useWeightUnit } from '@/lib/utils';

const DEFAULT_SHOWCASE = ['pull-ups', 'front-lever', 'weighted-pull-ups'];

export default function HomePage() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const exercises = useExercises();
  const weightUnit = useWeightUnit();
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showcase, setShowcase] = useState<string[]>(DEFAULT_SHOWCASE);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  // Load showcase config
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SHOWCASE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 3) setShowcase(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Check if onboarding is needed after login
  useEffect(() => {
    if (user && !authLoading) {
      try {
        const done = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
        if (!done) setShowOnboarding(true);
      } catch {
        // ignore
      }
    }
  }, [user, authLoading]);

  // Fetch user's PRs
  useEffect(() => {
    if (!user) {
      setRecords([]);
      return;
    }

    let cancelled = false;
    async function fetchRecords() {
      setFetching(true);
      try {
        const q = query(
          collection(getClientDb(), 'records'),
          where('userId', '==', user!.uid),
          orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PRRecord);
        // Deduplicate by exerciseId — keep the latest
        const seen = new Set<string>();
        const deduped = docs.filter((r) => {
          if (seen.has(r.exerciseId)) return false;
          seen.add(r.exerciseId);
          return true;
        });
        setRecords(deduped);
      } catch (err) {
        console.error('[HomePage] Firestore query failed:', err);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    fetchRecords();
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  const updateShowcaseSlot = useCallback((slotIndex: number, exerciseId: string) => {
    setShowcase((prev) => {
      const next = [...prev];
      next[slotIndex] = exerciseId;
      localStorage.setItem(STORAGE_KEYS.SHOWCASE, JSON.stringify(next));
      return next;
    });
    setEditingSlot(null);
  }, []);

  const prMap = new Map(records.map((r) => [r.exerciseId, r]));

  const greeting = user
    ? `Hey, ${user.displayName?.split(' ')[0] ?? 'Athlete'}`
    : 'Welcome to PR Vault';

  const displayRecords = records.slice(0, 5);

  return (
    <div className="flex min-h-dvh flex-col bg-[#09090b] pb-28 w-full max-w-2xl mx-auto">
      {/* Header */}
      <header className="px-5 pt-12 pb-6 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">
              {user ? 'Home' : 'Calisthenics PRs'}
            </p>
            <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">{greeting}</h1>
          </div>
          {user ? (
            <Link href="/profile">
              <img
                src={user.photoURL ?? ''}
                alt="avatar"
                className="h-10 w-10 rounded-full ring-2 ring-emerald-500/40 transition-opacity hover:opacity-80 md:h-12 md:w-12"
              />
            </Link>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Authenticated: Showcase + PRs */}
      {user && (
        <>
          {/* Customizable PR Showcase */}
          <section className="mb-6 grid grid-cols-3 gap-3 px-5 md:px-8 md:gap-4">
            {showcase.map((exerciseId, i) => {
              const exercise = exercises.find((e) => e.id === exerciseId);
              const pr = prMap.get(exerciseId);
              const style = exercise ? categoryStyle[exercise.category] : categoryStyle.reps;
              const isEditing = editingSlot === i;

              return (
                <div key={`slot-${i}`} className="relative">
                  <button
                    onClick={() => setEditingSlot(isEditing ? null : i)}
                    className={`w-full rounded-2xl border ${style.border} bg-white/[0.03] p-3 backdrop-blur-xl transition-all md:p-4 text-left ${
                      isEditing ? 'ring-1 ring-emerald-500/50' : ''
                    }`}
                  >
                    <p className="mb-1 truncate text-[10px] font-medium uppercase tracking-wider text-white/40 md:text-[11px]">
                      {exercise?.name ?? 'Choose'}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className={`text-lg font-black md:text-xl ${pr ? style.accent : 'text-white/20'}`}>
                        {pr ? formatScoreUpper(pr, weightUnit) : '—'}
                      </span>
                      {pr?.validated && (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </div>
                    <ChevronDown className="absolute top-2 right-2 h-3 w-3 text-white/20" />
                  </button>

                  {/* Inline exercise picker */}
                  {isEditing && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/[0.1] bg-zinc-900/98 shadow-2xl backdrop-blur-2xl scrollbar-hide">
                      {exercises.map((ex) => {
                        const exStyle = categoryStyle[ex.category];
                        return (
                          <button
                            key={ex.id}
                            onClick={() => updateShowcaseSlot(i, ex.id)}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-white/[0.06] ${
                              exerciseId === ex.id ? 'bg-emerald-500/10 text-white' : 'text-white/70'
                            }`}
                          >
                            <span className="truncate">{ex.name}</span>
                            <span className={`shrink-0 text-[9px] font-semibold uppercase ${exStyle.accent}`}>
                              {exStyle.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Close picker on outside click */}
          {editingSlot !== null && (
            <div className="fixed inset-0 z-20" onClick={() => setEditingSlot(null)} />
          )}

          {/* PR Feed */}
          <section className="flex-1 px-5 md:px-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              Your Top PRs
            </h2>

            {authLoading || fetching ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : displayRecords.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                {displayRecords.map((record) => (
                  <PRCard key={record.id} record={record} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                  <Flame className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-sm font-medium text-white/50">No PRs yet</p>
                <p className="mt-1 text-xs text-white/30">
                  Tap the + button to log your first record
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Unauthenticated: Landing hero */}
      {!user && !authLoading && (
        <section className="flex flex-1 flex-col items-center justify-center px-6 text-center md:px-8">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 md:h-24 md:w-24">
            <Flame className="h-10 w-10 text-emerald-400 md:h-12 md:w-12" />
          </div>
          <h2 className="mb-3 text-xl font-black text-white md:text-2xl">
            Track Your Calisthenics PRs
          </h2>
          <p className="mb-8 max-w-sm text-sm leading-relaxed text-white/50">
            Log personal records, compete on leaderboards, and push your limits with the community.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={loginWithGoogle}
              className="rounded-full bg-emerald-500 px-8 py-3 text-sm font-bold text-black transition-all hover:bg-emerald-400 active:scale-95"
            >
              Sign in with Google
            </button>
          </div>
          <div className="mt-10 grid w-full max-w-xs grid-cols-3 gap-4 text-center md:max-w-sm">
            <div>
              <Zap className="mx-auto mb-1.5 h-5 w-5 text-cyan-400" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Rep PRs</p>
            </div>
            <div>
              <Timer className="mx-auto mb-1.5 h-5 w-5 text-cyan-400" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Static Holds</p>
            </div>
            <div>
              <TrendingUp className="mx-auto mb-1.5 h-5 w-5 text-amber-400" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Weighted</p>
            </div>
          </div>
        </section>
      )}

      {/* Loading state */}
      {authLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {/* Bottom Nav + Modals */}
      <BottomNav onAddPress={() => setModalOpen(true)} />
      <AddPRModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={() => setRefreshKey((k) => k + 1)} />
      <OnboardingModal
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}
