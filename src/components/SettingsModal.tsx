'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { X, Loader2, Trash2 } from 'lucide-react';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { STORAGE_KEYS } from '@/lib/constants';
import { useToast } from '@/context/ToastContext';
import { useEscapeClose } from '@/lib/useEscapeClose';
import type { WeightUnit } from '@/types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSettingsChanged?: () => void;
}

export default function SettingsModal({ open, onClose, onSettingsChanged }: SettingsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [hideFromLeaderboard, setHideFromLeaderboard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  // Load settings from Firestore
  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    getDoc(doc(getClientDb(), 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const unit = data.weightUnit === 'lbs' ? 'lbs' : 'kg';
          setWeightUnit(unit);
          setHideFromLeaderboard(data.hideFromLeaderboard === true);
        }
      })
      .catch((err) => console.error('[Settings] Failed to load:', err))
      .finally(() => setLoading(false));
  }, [open, user]);

  const saveField = useCallback(async (field: string, value: unknown) => {
    if (!user) return;
    await setDoc(doc(getClientDb(), 'users', user.uid), { [field]: value }, { merge: true });
  }, [user]);

  const handleWeightUnit = async (unit: WeightUnit) => {
    setWeightUnit(unit);
    localStorage.setItem(STORAGE_KEYS.WEIGHT_UNIT, unit);
    // Dispatch storage event for same-tab listeners
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.WEIGHT_UNIT, newValue: unit }));
    await saveField('weightUnit', unit);
    onSettingsChanged?.();
  };

  const handleHideLeaderboard = async (hide: boolean) => {
    if (!user) return;
    setHideFromLeaderboard(hide);
    await saveField('hideFromLeaderboard', hide);
    // Denormalize onto all user's records for efficient leaderboard filtering
    try {
      const q = query(collection(getClientDb(), 'records'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((d) => setDoc(d.ref, { hideFromLeaderboard: hide }, { merge: true })),
      );
    } catch (err) {
      console.error('[Settings] Failed to update records:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (!confirm('Clear all PR history? This removes your progress graphs but keeps your current PRs.')) return;
    setClearing(true);
    try {
      const q = query(collection(getClientDb(), 'pr_history'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const deletes = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletes);
      toast('Progress history cleared.');
      onSettingsChanged?.();
    } catch (err) {
      console.error('[Settings] Failed to clear history:', err);
      toast('Failed to clear history.', 'error');
    } finally {
      setClearing(false);
    }
  };

  useEscapeClose(open, onClose);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up max-w-2xl mx-auto">
        <div className="rounded-t-3xl border-t border-white/[0.08] bg-zinc-900/95 px-6 pb-10 pt-4 shadow-2xl backdrop-blur-2xl">
          {/* Drag handle */}
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Settings</h2>
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Weight Unit */}
              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Weight Unit
                </span>
                <div className="flex gap-2">
                  {(['kg', 'lbs'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => handleWeightUnit(u)}
                      className={`rounded-full px-5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                        weightUnit === u
                          ? 'bg-emerald-500 text-black'
                          : 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70'
                      }`}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hide from Leaderboard */}
              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Privacy
                </span>
                <button
                  onClick={() => handleHideLeaderboard(!hideFromLeaderboard)}
                  role="switch"
                  aria-checked={hideFromLeaderboard}
                  className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3"
                >
                  <div className="text-left">
                    <p className="text-sm text-white/90">Hide from Leaderboard</p>
                    <p className="text-xs text-white/40">Your PRs won't appear in public rankings</p>
                  </div>
                  <div
                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                      hideFromLeaderboard ? 'bg-emerald-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        hideFromLeaderboard ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Clear PR History */}
              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Data
                </span>
                <button
                  onClick={handleClearHistory}
                  disabled={clearing}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-left transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  {clearing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-red-400">Clear PR History</p>
                    <p className="text-xs text-white/40">Removes progress graph data, keeps your PRs</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
