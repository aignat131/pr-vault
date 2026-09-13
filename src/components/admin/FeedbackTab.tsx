'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  limit,
} from 'firebase/firestore';
import { Bug, Lightbulb, MessageCircle } from 'lucide-react';
import { getClientDb } from '@/lib/firebase';
import type { Feedback, FeedbackType, FeedbackStatus } from '@/types';

type Filter = 'all' | FeedbackType | 'new';

const filterOptions: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'general', label: 'General' },
];

const typeBadge: Record<FeedbackType, { bg: string; text: string; icon: typeof Bug }> = {
  bug: { bg: 'bg-red-500/15', text: 'text-red-400', icon: Bug },
  feature: { bg: 'bg-violet-500/15', text: 'text-violet-400', icon: Lightbulb },
  general: { bg: 'bg-white/[0.08]', text: 'text-white/60', icon: MessageCircle },
};

function formatTimestamp(ts: { seconds: number }): string {
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FeedbackTab() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchFeedback = useCallback(async () => {
    try {
      const q = query(
        collection(getClientDb(), 'feedback'),
        orderBy('createdAt', 'desc'),
        limit(100),
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Feedback));
    } catch (err) {
      console.error('[Feedback] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(getClientDb(), 'feedback', id), { status: 'read' as FeedbackStatus });
      setItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'read' as FeedbackStatus } : f)),
      );
    } catch (err) {
      console.error('[Feedback] Failed to mark as read:', err);
    }
  };

  const handleExpand = (id: string) => {
    const isClosing = expandedId === id;
    setExpandedId(isClosing ? null : id);
    if (!isClosing) {
      const item = items.find((f) => f.id === id);
      if (item && item.status === 'new') markAsRead(id);
      setReplyText(item?.adminReply ?? '');
    }
  };

  const sendReply = async (id: string) => {
    const text = replyText.trim();
    if (!text) return;
    setReplying(true);
    try {
      await updateDoc(doc(getClientDb(), 'feedback', id), { adminReply: text });
      setItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, adminReply: text } : f)),
      );
    } catch (err) {
      console.error('[Feedback] Failed to send reply:', err);
    } finally {
      setReplying(false);
    }
  };

  const filtered = items.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'new') return f.status === 'new';
    return f.type === filter;
  });

  const newCount = items.filter((f) => f.status === 'new').length;

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
            {opt.value === 'new' && newCount > 0 && (
              <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-black">
                {newCount}
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
          <p className="text-sm text-white/40">No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const badge = typeBadge[item.type];
            const BadgeIcon = badge.icon;
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleExpand(item.id!)}
                className={`w-full text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                  item.status === 'new'
                    ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
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
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                        <BadgeIcon className="h-3 w-3" />
                        {item.type}
                      </span>
                      {item.status === 'new' && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className={`mt-1 text-xs text-white/60 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {item.message}
                    </p>
                    <p className="mt-1.5 text-[10px] text-white/30">
                      {item.createdAt && formatTimestamp(item.createdAt as unknown as { seconds: number })}
                    </p>
                    {!isExpanded && item.adminReply && (
                      <p className="mt-1 text-[10px] text-emerald-400/60 italic">Replied</p>
                    )}
                  </div>
                </div>

                {/* Reply section (expanded) */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]" onClick={(e) => e.stopPropagation()}>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      Admin Reply
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 resize-none"
                    />
                    <button
                      onClick={() => sendReply(item.id!)}
                      disabled={replying || !replyText.trim()}
                      className="mt-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-black transition-all hover:bg-emerald-400 disabled:opacity-40"
                    >
                      {replying ? 'Sending...' : item.adminReply ? 'Update Reply' : 'Send Reply'}
                    </button>
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
