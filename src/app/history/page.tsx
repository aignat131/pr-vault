'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, where, startAfter, type QueryDocumentSnapshot } from 'firebase/firestore';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import PRCard from '@/components/PRCard';
import BottomNav from '@/components/BottomNav';
import AddPRModal from '@/components/AddPRModal';
import type { PRRecord, ExerciseCategory } from '@/types';

function formatRelativeTime(seconds: number): string {
  const now = Date.now();
  const diff = Math.floor((now - seconds * 1000) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

type CategoryFilter = 'all' | ExerciseCategory;

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const fetchHistory = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setLastDoc(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const constraints = [
        ...(categoryFilter !== 'all' ? [where('category', '==', categoryFilter)] : []),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
        ...(!reset && lastDoc ? [startAfter(lastDoc)] : []),
      ];
      const q = query(collection(getClientDb(), 'records'), ...constraints);
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PRRecord);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setRecords((prev) => reset ? docs : [...prev, ...docs]);
    } catch (err) {
      console.error('[History] Firestore query failed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryFilter, lastDoc]);

  useEffect(() => {
    fetchHistory(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, refreshKey]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#09090b] pb-28 w-full max-w-2xl mx-auto">
      {/* Header */}
      <header className="px-5 pt-12 pb-2 md:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">
              Community
            </p>
            <h1 className="text-2xl font-black text-white">Activity</h1>
          </div>
        </div>
      </header>

      {/* Category filters */}
      <div className="flex gap-1.5 px-5 mt-3 md:px-8">
        {(['all', 'reps', 'static', 'weighted'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
              categoryFilter === cat
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Activity feed */}
      <section className="mt-4 flex-1 px-5 md:px-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
              <Loader2 className="h-5 w-5 text-white/20" />
            </div>
            <p className="text-sm font-medium text-white/40">No activity yet</p>
            <p className="mt-1 text-xs text-white/25">
              {categoryFilter !== 'all'
                ? `No ${categoryFilter} records found. Try a different filter!`
                : 'Community PRs will show up here once people start training!'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {records.map((record) => (
              <div key={record.id}>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/30">
                  {record.createdAt && formatRelativeTime(record.createdAt.seconds)}
                </p>
                <PRCard record={record} currentUserId={user?.uid ?? null} />
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => fetchHistory(false)}
                disabled={loadingMore}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            )}
          </div>
        )}
      </section>

      <BottomNav onAddPress={() => setModalOpen(true)} />
      <AddPRModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
