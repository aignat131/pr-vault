'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { ExternalLink, Crown, Medal, Award, ChevronLeft, Settings2, Star } from 'lucide-react';
import Link from 'next/link';
import { getClientDb } from '@/lib/firebase';
import { useExercises } from '@/context/ExercisesContext';
import BottomNav from '@/components/BottomNav';
import AddPRModal from '@/components/AddPRModal';
import FavoritesModal from '@/components/FavoritesModal';
import type { PRRecord, Gender } from '@/types';

const STORAGE_KEY = 'pr-vault-favorite-exercises';
const DEFAULT_FAVORITES = ['pull-ups', 'muscle-ups', 'dips', 'handstand-hold', 'front-lever', 'weighted-pull-ups'];

// Demo leaderboard data
const DEMO_LEADERBOARD: PRRecord[] = [
  {
    id: 'lb-1',
    userId: 'd1',
    username: 'Alex K.',
    exerciseId: 'pull-ups',
    exerciseName: 'Pull-ups',
    category: 'reps',
    score: 35,
    videoUrl: 'https://youtube.com',
    createdAt: Timestamp.fromDate(new Date('2026-09-01')),
  },
  {
    id: 'lb-2',
    userId: 'd2',
    username: 'Maya R.',
    exerciseId: 'pull-ups',
    exerciseName: 'Pull-ups',
    category: 'reps',
    score: 30,
    createdAt: Timestamp.fromDate(new Date('2026-09-02')),
  },
  {
    id: 'lb-3',
    userId: 'd3',
    username: 'Jordan T.',
    exerciseId: 'pull-ups',
    exerciseName: 'Pull-ups',
    category: 'reps',
    score: 28,
    videoUrl: 'https://instagram.com',
    createdAt: Timestamp.fromDate(new Date('2026-09-03')),
  },
  {
    id: 'lb-4',
    userId: 'd4',
    username: 'Sam L.',
    exerciseId: 'pull-ups',
    exerciseName: 'Pull-ups',
    category: 'reps',
    score: 25,
    createdAt: Timestamp.fromDate(new Date('2026-09-04')),
  },
  {
    id: 'lb-5',
    userId: 'd5',
    username: 'Chris B.',
    exerciseId: 'pull-ups',
    exerciseName: 'Pull-ups',
    category: 'reps',
    score: 22,
    createdAt: Timestamp.fromDate(new Date('2026-09-05')),
  },
];

const podiumIcons = [
  { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10 ring-yellow-400/30' },
  { icon: Medal, color: 'text-zinc-300', bg: 'bg-zinc-300/10 ring-zinc-300/30' },
  { icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10 ring-amber-600/30' },
] as const;

type GenderFilter = 'all' | Gender;

function formatLeaderboardScore(record: PRRecord): string {
  switch (record.category) {
    case 'reps':
      return `${record.score} reps`;
    case 'static':
      return `${record.score}s`;
    case 'weighted':
      return `+${record.addedWeightKg ?? record.score}kg`;
  }
}

export default function LeaderboardPage() {
  const exercises = useExercises();
  const allTabs = exercises.map((ex) => ({ id: ex.id, label: ex.name }));

  const [favorites, setFavorites] = useState<Set<string>>(new Set(DEFAULT_FAVORITES));
  const [activeTab, setActiveTab] = useState<string>(allTabs[0]?.id ?? 'pull-ups');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [favModalOpen, setFavModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Sort tabs: favorites first, then rest
  const sortedTabs = [...allTabs].sort((a, b) => {
    const aFav = favorites.has(a.id) ? 0 : 1;
    const bFav = favorites.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  const toggleFavorite = useCallback((exerciseId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const fetchLeaderboard = useCallback(async (exerciseId: string, gender: GenderFilter) => {
    setLoading(true);
    try {
      const constraints = [
        where('exerciseId', '==', exerciseId),
        ...(gender !== 'all' ? [where('gender', '==', gender)] : []),
        orderBy('score', 'desc'),
        limit(20),
      ];
      const q = query(collection(getClientDb(), 'records'), ...constraints);
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PRRecord);

      // Deduplicate: keep only the highest score per user
      const byUser = new Map<string, PRRecord>();
      for (const rec of docs) {
        const existing = byUser.get(rec.userId);
        if (!existing || rec.score > existing.score) {
          byUser.set(rec.userId, rec);
        }
      }
      const deduped = Array.from(byUser.values()).sort((a, b) => b.score - a.score);

      setRecords(deduped.length > 0 ? deduped : (gender === 'all' ? DEMO_LEADERBOARD : []));
    } catch {
      setRecords(gender === 'all' ? DEMO_LEADERBOARD : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(activeTab, genderFilter);
  }, [activeTab, genderFilter, fetchLeaderboard]);

  return (
    <div className="min-h-dvh bg-[#09090b] pb-28 max-w-lg mx-auto overflow-x-hidden">
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
            <h1 className="text-xl font-black text-white">Leaderboards</h1>
          </div>
          <button
            onClick={() => setFavModalOpen(true)}
            className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Gender toggle */}
      <div className="flex gap-1.5 px-5 mt-3">
        {(['all', 'male', 'female'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGenderFilter(g)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
              genderFilter === g
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {g === 'all' ? 'All' : g === 'male' ? 'Men' : 'Women'}
          </button>
        ))}
      </div>

      {/* Horizontal scrollable filter tabs */}
      <div className="relative mt-3 mb-4">
        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto px-5 pb-2 scrollbar-hide"
        >
          {sortedTabs.map((tab) => {
            const active = activeTab === tab.id;
            const isFav = favorites.has(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'bg-white/[0.05] text-white/50 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {isFav && (
                  <Star className={`h-3 w-3 ${active ? 'fill-black/40 text-black/40' : 'fill-amber-400/60 text-amber-400/60'}`} />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
        {/* Fade edge */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-[#09090b]" />
      </div>

      {/* Rankings list */}
      <section className="px-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-white/40">No records yet</p>
            <p className="mt-1 text-xs text-white/25">
              Be the first to set a PR!
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {records.map((record, i) => {
              const podium = i < 3 ? podiumIcons[i] : null;

              return (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200 hover:bg-white/[0.04] ${
                    i < 3
                      ? 'border-white/[0.08] bg-white/[0.03] backdrop-blur-xl'
                      : 'border-transparent bg-white/[0.02]'
                  }`}
                >
                  {/* Rank */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                    {podium ? (
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ${podium.bg}`}
                      >
                        <podium.icon className={`h-4 w-4 ${podium.color}`} />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-white/30">
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar + name */}
                  <div className="flex flex-1 items-center gap-2.5 min-w-0">
                    {record.userAvatar ? (
                      <img
                        src={record.userAvatar}
                        alt={record.username}
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">
                        {record.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-sm font-medium text-white/90">
                      {record.username}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-black ${
                        i === 0
                          ? 'text-yellow-400'
                          : i === 1
                            ? 'text-zinc-300'
                            : i === 2
                              ? 'text-amber-600'
                              : 'text-white/70'
                      }`}
                    >
                      {formatLeaderboardScore(record)}
                    </span>

                    {record.videoUrl && (
                      <a
                        href={record.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BottomNav onAddPress={() => setModalOpen(true)} />
      <AddPRModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <FavoritesModal
        open={favModalOpen}
        onClose={() => setFavModalOpen(false)}
        favorites={favorites}
        onToggle={toggleFavorite}
      />
    </div>
  );
}
