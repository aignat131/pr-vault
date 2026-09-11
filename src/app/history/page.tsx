'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getClientDb } from '@/lib/firebase';
import PRCard from '@/components/PRCard';
import BottomNav from '@/components/BottomNav';
import AddPRModal from '@/components/AddPRModal';
import type { PRRecord } from '@/types';

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

export default function HistoryPage() {
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(getClientDb(), 'records'),
        orderBy('createdAt', 'desc'),
        limit(50),
      );
      const snap = await getDocs(q);
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PRRecord));
    } catch (err) {
      console.error('[History] Firestore query failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  return (
    <div className="min-h-dvh bg-[#09090b] pb-28 max-w-2xl mx-auto">
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

      {/* Activity feed */}
      <section className="mt-4 px-5 md:px-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm text-white/40">No records yet</p>
            <p className="mt-1 text-xs text-white/25">
              Be the first to set a PR!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id}>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/30">
                  {record.createdAt && formatRelativeTime(record.createdAt.seconds)}
                </p>
                <PRCard record={record} />
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav onAddPress={() => setModalOpen(true)} />
      <AddPRModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
