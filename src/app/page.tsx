'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { Flame, Zap, TrendingUp } from 'lucide-react';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import PRCard from '@/components/PRCard';
import BottomNav from '@/components/BottomNav';
import AddPRModal from '@/components/AddPRModal';
import type { PRRecord } from '@/types';

// Demo data for unauthenticated visitors
const DEMO_RECORDS: PRRecord[] = [
  {
    id: 'demo-1',
    userId: 'demo',
    username: 'Alex K.',
    exerciseId: 'muscle-ups',
    exerciseName: 'Muscle-ups',
    category: 'reps',
    score: 12,
    videoUrl: 'https://youtube.com',
    createdAt: Timestamp.fromDate(new Date('2026-09-01')),
  },
  {
    id: 'demo-2',
    userId: 'demo',
    username: 'Maya R.',
    exerciseId: 'front-lever',
    exerciseName: 'Front Lever',
    category: 'static',
    score: 28,
    createdAt: Timestamp.fromDate(new Date('2026-09-03')),
  },
  {
    id: 'demo-3',
    userId: 'demo',
    username: 'Jordan T.',
    exerciseId: 'weighted-pull-ups',
    exerciseName: 'Weighted Pull-ups',
    category: 'weighted',
    score: 100,
    addedWeightKg: 40,
    videoUrl: 'https://instagram.com',
    createdAt: Timestamp.fromDate(new Date('2026-09-05')),
  },
  {
    id: 'demo-4',
    userId: 'demo',
    username: 'Sam L.',
    exerciseId: 'handstand-hold',
    exerciseName: 'Handstand Hold',
    category: 'static',
    score: 62,
    createdAt: Timestamp.fromDate(new Date('2026-09-06')),
  },
  {
    id: 'demo-5',
    userId: 'demo',
    username: 'Chris B.',
    exerciseId: 'pull-ups',
    exerciseName: 'Pull-ups',
    category: 'reps',
    score: 32,
    createdAt: Timestamp.fromDate(new Date('2026-09-07')),
  },
];

export default function HomePage() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [totalPRs, setTotalPRs] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [fetching, setFetching] = useState(false);

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
          limit(5),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PRRecord);
        setRecords(docs);
        setTotalPRs(snap.size);
      } catch (err) {
        console.error('[HomePage] Firestore query failed:', err);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    fetchRecords();
    return () => { cancelled = true; };
  }, [user, modalOpen]); // refetch after modal closes

  const displayRecords = user ? records : DEMO_RECORDS;
  const greeting = user
    ? `Hey, ${user.displayName?.split(' ')[0] ?? 'Athlete'}`
    : 'Welcome to PR Vault';

  return (
    <div className="min-h-dvh bg-[#09090b] pb-28">
      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">
              {user ? 'Dashboard' : 'Calisthenics PRs'}
            </p>
            <h1 className="mt-1 text-2xl font-black text-white">{greeting}</h1>
          </div>
          {user ? (
            <img
              src={user.photoURL ?? ''}
              alt="avatar"
              className="h-10 w-10 rounded-full ring-2 ring-emerald-500/40"
            />
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

      {/* Quick Stats */}
      {user && (
        <section className="mb-6 grid grid-cols-3 gap-3 px-5">
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
      )}

      {/* PR Feed */}
      <section className="px-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
          {user ? 'Your Top PRs' : 'Community Highlights'}
        </h2>

        {authLoading || fetching ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-3">
            {displayRecords.map((record) => (
              <PRCard key={record.id} record={record} />
            ))}
          </div>
        )}

        {!user && !authLoading && (
          <p className="mt-6 text-center text-xs text-white/30">
            Sign in to track your own personal records
          </p>
        )}
      </section>

      {/* Bottom Nav + Modal */}
      <BottomNav onAddPress={() => setModalOpen(true)} />
      <AddPRModal open={modalOpen} onClose={() => setModalOpen(false)} />
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="text-xl font-black text-white">{value}</span>
      </div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </p>
    </div>
  );
}
