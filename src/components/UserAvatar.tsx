'use client';

import type { User } from 'firebase/auth';

interface UserAvatarProps {
  user: User;
  /** Size, text size, and ring classes */
  className?: string;
}

/** Shows the user's photo, or their initial when they have none (e.g. email sign-up). */
export default function UserAvatar({ user, className = '' }: UserAvatarProps) {
  if (user.photoURL) {
    return <img src={user.photoURL} alt="avatar" className={`rounded-full object-cover ${className}`} />;
  }
  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
  return (
    <div
      aria-label="avatar"
      className={`flex items-center justify-center rounded-full bg-emerald-500/15 font-black text-emerald-300 ${className}`}
    >
      {initial}
    </div>
  );
}
