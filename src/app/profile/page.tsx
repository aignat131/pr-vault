'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { LogOut, Flame, Calendar, Layers, Shield } from 'lucide-react';
import Link from 'next/link';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useExercises } from '@/context/ExercisesContext';
import { type ExerciseCategory, type Gender } from '@/types';
import type { PRRecord } from '@/types';
import BottomNav from '@/components/BottomNav';
import AddPRModal from '@/components/AddPRModal';

const categoryStyle = {
  reps: {
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
    border: 'border-emerald-500/20',
    label: 'Reps',
  },
  static: {
    accent: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300',
    border: 'border-cyan-500/20',
    label: 'Static',
  },
  weighted: {
    accent: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    border: 'border-amber-500/20',
    label: 'Weighted',
  },
} as const;

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

function formatMemberSince(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function ProfilePage() {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const exercises = useExercises();
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);

  // Load user gender from Firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(getClientDb(), 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.gender) {
          setGender(data.gender);
          localStorage.setItem('pr-vault-user-gender', data.gender);
        }
      }
    }).catch(() => {});
  }, [user]);

  const updateGender = async (g: Gender) => {
    if (!user) return;
    setGender(g);
    localStorage.setItem('pr-vault-user-gender', g);
    await setDoc(doc(getClientDb(), 'users', user.uid), { gender: g }, { merge: true });
  };

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
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PRRecord));
      } catch (err) {
        console.error('[Profile] Firestore query failed:', err);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }
    fetchRecords();
    return () => { cancelled = true; };
  }, [user, modalOpen]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#09090b] max-w-lg mx-auto">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#09090b] px-6 pb-28 max-w-lg mx-auto">
        <h1 className="mb-2 text-2xl font-black text-white">Sign in</h1>
        <p className="mb-6 text-sm text-white/50">
          Track your calisthenics personal records
        </p>
        <button
          onClick={loginWithGoogle}
          className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
        >
          Continue with Google
        </button>
        <BottomNav onAddPress={() => {}} />
      </div>
    );
  }

  // Build a map of exerciseId -> PRRecord for quick lookup
  const prMap = new Map(records.map((r) => [r.exerciseId, r]));
  const categories: ExerciseCategory[] = ['reps', 'static', 'weighted'];
  const categoriesWithPRs = new Set(records.map((r) => r.category));

  return (
    <div className="min-h-dvh bg-[#09090b] pb-28 max-w-lg mx-auto">
      {/* Header */}
      <header className="px-5 pt-12 pb-2">
        <p className="text-xs font-medium uppercase tracking-widest text-white/40">
          Profile
        </p>
      </header>

      {/* Avatar + info */}
      <div className="flex flex-col items-center px-5 pb-4">
        <img
          src={user.photoURL ?? ''}
          alt="avatar"
          className="mb-4 h-20 w-20 rounded-full ring-2 ring-emerald-500/40"
        />
        <h1 className="text-xl font-black text-white">
          {user.displayName ?? 'Athlete'}
        </h1>
        <p className="mt-1 text-sm text-white/40">{user.email}</p>

        {/* Gender selector */}
        <div className="mt-4 flex items-center gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              onClick={() => updateGender(g)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                gender === g
                  ? 'bg-emerald-500 text-black'
                  : 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {g === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <section className="mb-6 grid grid-cols-3 gap-3 px-5">
        <StatCard
          icon={<Flame className="h-4 w-4 text-emerald-400" />}
          value={String(records.length)}
          label="Total PRs"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4 text-cyan-400" />}
          value={formatMemberSince(user.metadata.creationTime ?? undefined)}
          label="Member since"
        />
        <StatCard
          icon={<Layers className="h-4 w-4 text-amber-400" />}
          value={`${categoriesWithPRs.size}/3`}
          label="Categories"
        />
      </section>

      {/* Personal Bests by Category */}
      {fetching ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <section className="space-y-6 px-5">
          {categories.map((cat) => {
            const style = categoryStyle[cat];
            const exercisesInCat = exercises.filter((e) => e.category === cat);
            return (
              <div key={cat}>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                    {style.label}
                  </span>
                </h3>
                <div className={`rounded-2xl border ${style.border} bg-white/[0.02] divide-y divide-white/[0.06]`}>
                  {exercisesInCat.map((ex) => {
                    const pr = prMap.get(ex.id);
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className={`text-sm ${pr ? 'text-white/90' : 'text-white/25'}`}>
                          {ex.name}
                        </span>
                        <span className={`text-sm font-bold ${pr ? style.accent : 'text-white/20'}`}>
                          {pr ? formatScore(pr) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Admin link + Sign out */}
      <div className="flex flex-col items-center gap-3 px-5 pt-8 pb-4">
        {user.email === 'aignat131@gmail.com' && (
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-full border border-emerald-500/20 px-5 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10"
          >
            <Shield className="h-4 w-4" />
            Admin Hub
          </Link>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-red-500/30 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

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
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="text-lg font-black text-white">{value}</span>
      </div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </p>
    </div>
  );
}
