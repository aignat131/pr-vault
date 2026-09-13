'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { formatScore, categoryStyle, useWeightUnit } from '@/lib/utils';
import type { ValidationRequest, ValidationStatus, PRRecord } from '@/types';

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

const filterOptions: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

function formatTimestamp(ts: { seconds: number }): string {
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ValidationTab() {
  const { user } = useAuth();
  const weightUnit = useWeightUnit();
  const [items, setItems] = useState<ValidationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [rejectNoteId, setRejectNoteId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchValidations = useCallback(async () => {
    try {
      const q = query(
        collection(getClientDb(), 'validations'),
        orderBy('createdAt', 'asc'),
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ValidationRequest));
    } catch (err) {
      console.error('[Validations] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValidations();
  }, [fetchValidations]);

  const handleApprove = async (item: ValidationRequest) => {
    if (!user || !item.id) return;
    setProcessing(item.id);
    try {
      // Update validation status
      await updateDoc(doc(getClientDb(), 'validations', item.id), {
        status: 'approved' as ValidationStatus,
        reviewedBy: user.uid,
        reviewedAt: Timestamp.now(),
      });

      // Mark the record as validated
      await updateDoc(doc(getClientDb(), 'records', item.recordId), {
        validated: true,
      });

      setItems((prev) =>
        prev.map((v) =>
          v.id === item.id
            ? { ...v, status: 'approved' as ValidationStatus, reviewedBy: user.uid }
            : v,
        ),
      );
    } catch (err) {
      console.error('[Validations] Failed to approve:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (item: ValidationRequest) => {
    if (!user || !item.id) return;
    setProcessing(item.id);
    try {
      await updateDoc(doc(getClientDb(), 'validations', item.id), {
        status: 'rejected' as ValidationStatus,
        reviewedBy: user.uid,
        reviewedAt: Timestamp.now(),
        reviewNote: rejectNote.trim() || null,
      });

      setItems((prev) =>
        prev.map((v) =>
          v.id === item.id
            ? { ...v, status: 'rejected' as ValidationStatus, reviewedBy: user.uid, reviewNote: rejectNote.trim() || null }
            : v,
        ),
      );
      setRejectNoteId(null);
      setRejectNote('');
    } catch (err) {
      console.error('[Validations] Failed to reject:', err);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = items.filter((v) => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  const pendingCount = items.filter((v) => v.status === 'pending').length;

  return (
    <section className="px-5 space-y-4">
      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              filter === opt.value
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {opt.label}
            {opt.value === 'pending' && pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-black">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-white/40">
            {filter === 'pending' ? 'No pending validations' : 'No validations found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const style = categoryStyle[item.category];
            const isProcessing = processing === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 transition-all ${
                  item.status === 'approved'
                    ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                    : item.status === 'rejected'
                      ? 'border-red-500/20 bg-red-500/[0.03]'
                      : 'border-white/[0.08] bg-white/[0.03]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {item.userAvatar ? (
                    <img
                      src={item.userAvatar}
                      alt={item.username}
                      className="h-8 w-8 rounded-full ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                      {item.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/90 truncate">
                        {item.username}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                        {style.label}
                      </span>
                      {item.status === 'approved' && (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      {item.status === 'rejected' && (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      )}
                    </div>
                    <p className="text-xs text-white/40">
                      {item.exerciseName} &middot;{' '}
                      {formatScore({
                        score: item.score,
                        category: item.category,
                        addedWeightKg: item.addedWeightKg ?? undefined,
                      } as PRRecord, weightUnit)}
                      {item.createdAt && ` · ${formatTimestamp(item.createdAt as unknown as { seconds: number })}`}
                    </p>
                    {item.reviewNote && (
                      <p className="mt-1 text-xs text-red-400/70 italic">
                        Note: {item.reviewNote}
                      </p>
                    )}
                  </div>

                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full bg-white/[0.06] p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Action buttons — only for pending */}
                {item.status === 'pending' && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-white/[0.06] text-white/40 transition-all hover:bg-emerald-500/20 hover:text-emerald-300 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          if (rejectNoteId === item.id) {
                            handleReject(item);
                          } else {
                            setRejectNoteId(item.id!);
                            setRejectNote('');
                          }
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-white/[0.06] text-white/40 transition-all hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Reject
                      </button>
                    </div>

                    {/* Reject note input */}
                    {rejectNoteId === item.id && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-red-500/50"
                        />
                        <button
                          onClick={() => handleReject(item)}
                          disabled={isProcessing}
                          className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setRejectNoteId(null); setRejectNote(''); }}
                          className="rounded-xl bg-white/[0.06] px-3 py-1.5 text-xs text-white/40 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
