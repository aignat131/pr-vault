'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth, getAuthErrorMessage } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useEscapeClose } from '@/lib/useEscapeClose';

export type AuthMode = 'signin' | 'signup' | 'reset';

// Render conditionally (`{mode && <AuthModal … />}`) so form state resets on each open.
interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const MAX_NAME = 40;

const TITLES: Record<AuthMode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  reset: 'Reset password',
};

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30';

export default function AuthModal({ open, onClose, initialMode = 'signin' }: AuthModalProps) {
  const { user, loginWithGoogle, signUpWithEmail, loginWithEmail, resetPassword } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Close once signed in (covers email and Google popup flows)
  useEffect(() => {
    if (open && user) onClose();
  }, [open, user, onClose]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setResetSent(false);
    setPassword('');
    setConfirm('');
  };

  const validate = (): string | null => {
    const trimmedEmail = email.trim();
    if (mode === 'signup') {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) return 'Please enter your name (at least 2 characters).';
      if (trimmedName.length > MAX_NAME) return `Name must be at most ${MAX_NAME} characters.`;
    }
    if (!EMAIL_RE.test(trimmedEmail)) return 'Please enter a valid email address.';
    if (mode === 'reset') return null;
    if (!password) return 'Please enter your password.';
    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
      if (password !== confirm) return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        await signUpWithEmail(name, email, password);
        toast('Account created. Check your inbox to verify your email.');
      } else if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else {
        await resetPassword(email);
        setResetSent(true);
      }
    } catch (err) {
      // Don't reveal whether an account exists for password resets
      if (mode === 'reset' && (err as { code?: string })?.code === 'auth/user-not-found') {
        setResetSent(true);
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = useCallback(async () => {
    setError('');
    await loginWithGoogle();
  }, [loginWithGoogle]);

  useEscapeClose(open, onClose);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up max-w-2xl mx-auto">
        <div className="max-h-[90dvh] overflow-y-auto rounded-t-3xl border-t border-white/[0.08] bg-zinc-900/95 px-6 pb-10 pt-4 shadow-2xl backdrop-blur-2xl">
          {/* Drag handle */}
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{TITLES[mode]}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {mode !== 'reset' && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-black transition-all duration-200 hover:bg-white/90 active:scale-[0.98] disabled:opacity-50"
              >
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">or</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>
            </>
          )}

          {mode === 'reset' && resetSent ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                If an account exists for {email.trim()}, a password reset link has been sent. Check your inbox (and spam folder).
              </p>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-black transition-all duration-200 hover:bg-emerald-400 active:scale-[0.98]"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder="Name"
                  autoComplete="name"
                  maxLength={MAX_NAME}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              )}
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              {mode !== 'reset' && (
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 transition-colors hover:text-white/70"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
              {mode === 'signup' && (
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
              )}

              {mode === 'signin' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs text-white/40 transition-colors hover:text-white/70"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-black transition-all duration-200 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'signup' ? (
                  'Create account'
                ) : mode === 'signin' ? (
                  'Sign in'
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          )}

          {/* Mode switcher */}
          <p className="mt-5 text-center text-xs text-white/40">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-emerald-400 hover:text-emerald-300">
                  Sign up
                </button>
              </>
            ) : (
              <>
                {mode === 'signup' ? 'Already have an account? ' : 'Remembered it? '}
                <button type="button" onClick={() => switchMode('signin')} className="font-semibold text-emerald-400 hover:text-emerald-300">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
