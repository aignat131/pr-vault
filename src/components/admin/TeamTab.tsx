'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { Plus, Trash2, Loader2, Users, ShieldCheck, Dumbbell, Eye } from 'lucide-react';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { UserRole, RoleAssignment } from '@/types';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'moderator', label: 'Moderator' },
  { value: 'exercise_manager', label: 'Exercise Manager' },
  { value: 'reviewer', label: 'Reviewer' },
];

const roleBadge: Record<UserRole, { bg: string; text: string; icon: typeof Users }> = {
  owner: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: ShieldCheck },
  moderator: { bg: 'bg-violet-500/15', text: 'text-violet-400', icon: Users },
  exercise_manager: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: Dumbbell },
  reviewer: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', icon: Eye },
};

const roleLabel: Record<UserRole, string> = {
  owner: 'Owner',
  moderator: 'Moderator',
  exercise_manager: 'Exercise Manager',
  reviewer: 'Reviewer',
};

export default function TeamTab() {
  const { user } = useAuth();
  const [members, setMembers] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('reviewer');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(getClientDb(), 'roles'));
      setMembers(
        snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as RoleAssignment),
      );
    } catch (err) {
      console.error('[Team] Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (members.some((m) => m.email === trimmed)) {
      setError('This person already has a role.');
      return;
    }

    setAdding(true);
    setError('');

    try {
      // Look up user by email in the users collection to get their UID
      // If they haven't logged in yet, we store with a temp doc ID (their email hash)
      const usersQuery = query(
        collection(getClientDb(), 'users'),
        where('email', '==', trimmed),
      );
      const usersSnap = await getDocs(usersQuery);

      let targetUid: string;
      let displayName = trimmed.split('@')[0];
      let photoURL: string | null = null;

      if (!usersSnap.empty) {
        const userData = usersSnap.docs[0];
        targetUid = userData.id;
        displayName = userData.data().displayName || displayName;
        photoURL = userData.data().photoURL || null;
      } else {
        // User hasn't logged in yet — use email as a stable key
        // When they log in, RolesContext will find their role by UID
        // We need a workaround: store by email-based ID, then migrate on first login
        targetUid = trimmed.replace(/[^a-zA-Z0-9]/g, '_');
      }

      await setDoc(doc(getClientDb(), 'roles', targetUid), {
        email: trimmed,
        role,
        displayName,
        photoURL,
        grantedBy: user!.uid,
        grantedAt: Timestamp.now(),
      });

      setEmail('');
      await fetchMembers();
    } catch (err) {
      console.error('[Team] Failed to add member:', err);
      setError('Failed to add team member.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (uid: string) => {
    try {
      await deleteDoc(doc(getClientDb(), 'roles', uid));
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
    } catch (err) {
      console.error('[Team] Failed to remove member:', err);
    }
  };

  return (
    <section className="px-5 space-y-5">
      {/* Add member form */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Add Team Member</h3>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="user@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={adding}
          className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </div>

      {/* Owner card */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">You (Owner)</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
            Owner
          </span>
        </div>
      </div>

      {/* Team members list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-white/40">No team members yet</p>
          <p className="mt-1 text-xs text-white/25">Add people by their Gmail address</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          {members.map((member) => {
            const badge = roleBadge[member.role];
            const BadgeIcon = badge.icon;
            return (
              <div key={member.uid} className="flex items-center gap-3 px-4 py-3">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="h-8 w-8 rounded-full ring-1 ring-white/10"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">
                    {member.displayName}
                  </p>
                  <p className="text-xs text-white/40 truncate">{member.email}</p>
                </div>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                  <BadgeIcon className="h-3 w-3" />
                  {roleLabel[member.role]}
                </span>
                <button
                  onClick={() => handleRemove(member.uid)}
                  className="rounded-full p-1.5 text-white/20 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
