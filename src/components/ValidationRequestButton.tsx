'use client';

import { useState } from 'react';
import { setDoc, doc, Timestamp } from 'firebase/firestore';
import { ShieldCheck, Clock, XCircle, Loader2 } from 'lucide-react';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { MAX_ACTIVE_VALIDATIONS } from '@/lib/constants';
import type { PRRecord, ValidationRequest, ValidationStatus } from '@/types';

interface ValidationRequestButtonProps {
  record: PRRecord;
  validation: ValidationRequest | null;
  pendingCount: number;
  onRequested: () => void;
}

export default function ValidationRequestButton({
  record,
  validation,
  pendingCount,
  onRequested,
}: ValidationRequestButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Don't show if no video
  if (!record.videoUrl) return null;

  const handleRequest = async () => {
    if (!user || !record.id) return;
    setLoading(true);
    try {
      const docId = `${user.uid}_${record.exerciseId}`;
      await setDoc(doc(getClientDb(), 'validations', docId), {
        userId: user.uid,
        username: user.displayName ?? 'Anonymous',
        userAvatar: user.photoURL ?? null,
        exerciseId: record.exerciseId,
        exerciseName: record.exerciseName,
        category: record.category,
        recordId: record.id,
        videoUrl: record.videoUrl,
        score: record.score,
        addedWeightKg: record.addedWeightKg ?? null,
        status: 'pending' as ValidationStatus,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: Timestamp.now(),
      });
      onRequested();
    } catch (err) {
      console.error('[Validation] Failed to request:', err);
    } finally {
      setLoading(false);
    }
  };

  // Already validated (approved)
  if (validation?.status === 'approved' || record.validated) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <ShieldCheck className="h-3 w-3" />
        Validated
      </span>
    );
  }

  // Pending
  if (validation?.status === 'pending') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }

  // Rejected — allow re-request
  if (validation?.status === 'rejected') {
    const limitReached = pendingCount >= MAX_ACTIVE_VALIDATIONS;
    return (
      <button
        onClick={handleRequest}
        disabled={loading || limitReached}
        className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-40"
        title={limitReached ? `Max ${MAX_ACTIVE_VALIDATIONS} pending requests` : 'Re-request validation'}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
        Retry
      </button>
    );
  }

  // No validation yet — can request
  const limitReached = pendingCount >= MAX_ACTIVE_VALIDATIONS;
  return (
    <button
      onClick={handleRequest}
      disabled={loading || limitReached}
      className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50 transition-colors hover:bg-white/[0.12] hover:text-white/70 disabled:opacity-40"
      title={limitReached ? `Max ${MAX_ACTIVE_VALIDATIONS} pending requests` : 'Request validation'}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <ShieldCheck className="h-3 w-3" />
      )}
      Validate
    </button>
  );
}
