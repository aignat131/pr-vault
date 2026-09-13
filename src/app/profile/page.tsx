'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { LogOut, Flame, Calendar, Layers, Shield, Trash2, Share2, Link2, Check, MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useExercises } from '@/context/ExercisesContext';
import { type ExerciseCategory, type Gender } from '@/types';
import type { PRRecord, ValidationRequest } from '@/types';
import BottomNav from '@/components/BottomNav';
import AddPRModal from '@/components/AddPRModal';
import FeedbackModal from '@/components/FeedbackModal';
import SettingsModal from '@/components/SettingsModal';
import ProgressGraphs from '@/components/ProgressGraphs';
import ValidationRequestButton from '@/components/ValidationRequestButton';
import { categoryStyle, formatScore, useWeightUnit } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/constants';
import { useRoles } from '@/context/RolesContext';

function formatMemberSince(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function ProfilePage() {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const { hasAnyRole, userRole } = useRoles();
  const exercises = useExercises();
  const weightUnit = useWeightUnit();
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [validations, setValidations] = useState<Map<string, ValidationRequest>>(new Map());
  const [pendingValidationCount, setPendingValidationCount] = useState(0);

  const handleInvite = async () => {
    const url = window.location.origin;
    const text = `Join me on PR Vault and track your calisthenics personal records!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PR Vault', text, url });
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const deletePR = async (recordId: string) => {
    if (!confirm('Delete this PR? This cannot be undone.')) return;
    setDeletingId(recordId);
    try {
      await deleteDoc(doc(getClientDb(), 'records', recordId));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('[Profile] Failed to delete PR:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Load user gender from Firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(getClientDb(), 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.gender) {
          setGender(data.gender);
          localStorage.setItem(STORAGE_KEYS.GENDER, data.gender);
        }
      }
    }).catch((err) => console.error('[Profile] Failed to load gender:', err));
  }, [user]);

  const updateGender = async (g: Gender) => {
    if (!user) return;
    setGender(g);
    localStorage.setItem(STORAGE_KEYS.GENDER, g);
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
  }, [user, refreshKey]);

  const fetchValidations = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(getClientDb(), 'validations'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const map = new Map<string, ValidationRequest>();
      let pending = 0;
      snap.docs.forEach((d) => {
        const v = { id: d.id, ...d.data() } as ValidationRequest;
        map.set(v.exerciseId, v);
        if (v.status === 'pending') pending++;
      });
      setValidations(map);
      setPendingValidationCount(pending);
    } catch (err) {
      console.error('[Profile] Failed to fetch validations:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchValidations();
  }, [fetchValidations, refreshKey]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#09090b] max-w-2xl mx-auto">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#09090b] px-6 pb-28 max-w-2xl mx-auto">
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
    <div className="min-h-dvh bg-[#09090b] pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <header className="px-5 pt-12 pb-2 md:px-8">
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

        {/* Role badge */}
        {userRole && (
          <span className="mt-2 rounded-full bg-emerald-500/10 px-3 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
            {userRole.replace('_', ' ')}
          </span>
        )}

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

        {/* Admin link + Settings */}
        <div className="mt-4 flex items-center gap-2">
          {hasAnyRole && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-full border border-emerald-500/20 px-5 py-2 text-sm font-medium text-emerald-400 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10"
            >
              <Shield className="h-4 w-4" />
              Admin Hub
            </Link>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/[0.08] px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white/70"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Stats row */}
      <section className="mb-6 grid grid-cols-3 gap-3 px-5 md:px-8 md:gap-4">
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

      {/* Progress Graphs */}
      {records.length > 0 && <ProgressGraphs records={records} />}

      {/* Personal Bests — only exercises with PRs */}
      {fetching ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center px-5">
          <p className="text-sm text-white/40">No PRs yet</p>
          <p className="mt-1 text-xs text-white/25">Tap + to log your first record</p>
        </div>
      ) : (
        <section className="space-y-6 px-5 md:px-8">
          {categories.map((cat) => {
            const style = categoryStyle[cat];
            const exercisesWithPRs = exercises
              .filter((e) => e.category === cat && prMap.has(e.id))
              .sort((a, b) => (prMap.get(b.id)?.score ?? 0) - (prMap.get(a.id)?.score ?? 0));
            if (exercisesWithPRs.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                    {style.label}
                  </span>
                </h3>
                <div className={`rounded-2xl border ${style.border} bg-white/[0.02] divide-y divide-white/[0.06]`}>
                  {exercisesWithPRs.map((ex) => {
                    const pr = prMap.get(ex.id)!;
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-sm text-white/90">
                          {ex.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${style.accent}`}>
                            {formatScore(pr, weightUnit)}
                          </span>
                          <ValidationRequestButton
                            record={pr}
                            validation={validations.get(pr.exerciseId) ?? null}
                            pendingCount={pendingValidationCount}
                            onRequested={fetchValidations}
                          />
                          {pr.id && (
                            <button
                              onClick={() => deletePR(pr.id!)}
                              disabled={deletingId === pr.id}
                              className="rounded-full p-1 text-white/15 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Invite Friends */}
      <div className="mx-5 mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:mx-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <Link2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Invite Friends</p>
            <p className="text-xs text-white/40">Share the app with your training partners</p>
          </div>
          <button
            onClick={handleInvite}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              copied
                ? 'bg-emerald-500 text-black'
                : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                Share
              </>
            )}
          </button>
        </div>
      </div>

      {/* Send Feedback */}
      <div className="mx-5 mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:mx-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
            <MessageSquare className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Send Feedback</p>
            <p className="text-xs text-white/40">Report bugs or suggest features</p>
          </div>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white transition-all duration-200"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Write
          </button>
        </div>
      </div>

      {/* Sign out */}
      <div className="flex justify-center px-5 pt-8 pb-4">
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-red-500/30 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      <BottomNav onAddPress={() => setModalOpen(true)} />
      <AddPRModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={() => setRefreshKey((k) => k + 1)} gender={gender} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onSettingsChanged={() => setRefreshKey((k) => k + 1)} />
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
