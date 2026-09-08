'use client';

import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';
import { LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, loginWithGoogle, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#09090b]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#09090b] px-6 pb-28">
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

  return (
    <div className="min-h-dvh bg-[#09090b] pb-28">
      <header className="px-5 pt-12 pb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-white/40">
          Profile
        </p>
      </header>

      <div className="flex flex-col items-center px-5">
        <img
          src={user.photoURL ?? ''}
          alt="avatar"
          className="mb-4 h-20 w-20 rounded-full ring-2 ring-emerald-500/40"
        />
        <h1 className="text-xl font-black text-white">
          {user.displayName ?? 'Athlete'}
        </h1>
        <p className="mt-1 text-sm text-white/40">{user.email}</p>

        <button
          onClick={logout}
          className="mt-8 flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-red-500/30 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      <BottomNav onAddPress={() => {}} />
    </div>
  );
}
