'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Flame, Zap, TrendingUp, Timer } from 'lucide-react';
import Link from 'next/link';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import PRCard from '@/components/PRCard';
import BottomNav from '@/components/BottomNav';
import AddPRModal from '@/components/AddPRModal';
import OnboardingModal from '@/components/OnboardingModal';
import type { PRRecord } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';

export default function HomePage() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [totalPRs, setTotalPRs] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
      setTotalPRs(0);
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
        setRecords(deduped.slice(0, 5));
        setTotalPRs(deduped.length);
      } catch (err) {
        console.error('[HomePage] Firestore query failed:', err);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    fetchRecords();
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  const greeting = user
    ? `Hey, ${user.displayName?.split(' ')[0] ?? 'Athlete'}`
    : 'Welcome to PR Vault';

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

      {/* Authenticated: Stats + PRs */}
      {user && (
        <>
          {/* Quick Stats */}
          <section className="mb-6 grid grid-cols-3 gap-3 px-5 md:px-8 md:gap-4">
            <StatCard
              icon={<Flame className="h-4 w-4 text-emerald-400" />}
              value={totalPRs}
              label="Total PRs"
            />
            <StatCard
              icon={<Zap className="h-4 w-4 text-cyan-400" />}
              value={records.filter((r) => r.category === 'reps').length}
              label="Rep PRs"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
              value={records.filter((r) => r.category === 'weighted').length}
              label="Weighted"
            />
          </section>

          {/* PR Feed */}
          <section className="flex-1 px-5 md:px-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              Your Top PRs
            </h2>

            {authLoading || fetching ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : records.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                {records.map((record) => (
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

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 backdrop-blur-xl md:p-4">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="text-xl font-black text-white md:text-2xl">{value}</span>
      </div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 md:text-[11px]">
        {label}
      </p>
    </div>
  );
}
