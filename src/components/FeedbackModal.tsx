'use client';

import { useState, useCallback } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { X, Loader2 } from 'lucide-react';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useEscapeClose } from '@/lib/useEscapeClose';
import type { FeedbackType } from '@/types';

const feedbackTypes: { value: FeedbackType; label: string; style: string; activeStyle: string }[] = [
  { value: 'bug', label: 'Bug', style: 'bg-white/[0.06] text-white/40 hover:bg-red-500/20 hover:text-red-300', activeStyle: 'bg-red-500 text-white' },
  { value: 'feature', label: 'Feature', style: 'bg-white/[0.06] text-white/40 hover:bg-violet-500/20 hover:text-violet-300', activeStyle: 'bg-violet-500 text-white' },
  { value: 'general', label: 'General', style: 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70', activeStyle: 'bg-white text-black' },
];

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please enter your feedback.');
      return;
    }
    if (trimmed.length < 10) {
      setError('Please provide more detail (at least 10 characters).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(getClientDb(), 'feedback'), {
        userId: user.uid,
        username: user.displayName ?? 'Anonymous',
        userAvatar: user.photoURL ?? null,
        email: user.email ?? '',
        type,
        message: trimmed,
        status: 'new',
        createdAt: Timestamp.now(),
      });
      setSuccess(true);
      toast('Feedback sent. Thank you!');
      setTimeout(() => {
        setSuccess(false);
        setMessage('');
        setType('general');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[Feedback] Failed to submit:', err);
      toast('Failed to submit feedback.', 'error');
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, message, type, onClose, toast]);

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
            <h2 className="text-lg font-bold text-white">Send Feedback</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Type selector */}
          <div className="mb-4">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
              Type
            </span>
            <div className="flex gap-2">
              {feedbackTypes.map((ft) => (
                <button
                  key={ft.value}
                  onClick={() => setType(ft.value)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    type === ft.value ? ft.activeStyle : ft.style
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <label className="mb-6 block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
              Message
            </span>
            <textarea
              rows={4}
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
          </label>

          {error && (
            <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {success ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-black">
              Thank you for your feedback!
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-black transition-all duration-200 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
