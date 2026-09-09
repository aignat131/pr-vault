'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Trophy, Plus, User } from 'lucide-react';

interface BottomNavProps {
  onAddPress: () => void;
}

const leftItems = [
  { href: '/', icon: Home, label: 'Feed' },
  { href: '/leaderboard', icon: Trophy, label: 'Ranks' },
] as const;

const rightItems = [
  { href: '/profile', icon: User, label: 'Profile' },
] as const;

type NavItem = (typeof leftItems)[number] | (typeof rightItems)[number];

export default function BottomNav({ onAddPress }: BottomNavProps) {
  const pathname = usePathname();

  const renderItem = ({ href, icon: Icon, label }: NavItem) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-2 transition-all duration-200 ${
          active
            ? 'bg-white/10 text-white'
            : 'text-white/40 hover:text-white/70'
        }`}
      >
        <Icon className="h-5 w-5" />
        <span className="text-[9px] font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-zinc-900/80 px-2 py-2 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        {leftItems.map(renderItem)}

        {/* Center add button */}
        <button
          onClick={onAddPress}
          className="mx-1 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-110 hover:bg-emerald-400 active:scale-95"
        >
          <Plus className="h-6 w-6" strokeWidth={3} />
        </button>

        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}
