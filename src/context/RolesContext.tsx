'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { OWNER_EMAIL } from '@/lib/constants';
import type { UserRole } from '@/types';

interface RolesContextValue {
  userRole: UserRole | null;
  roleLoading: boolean;
  isOwner: boolean;
  canManageTeam: boolean;
  canManageExercises: boolean;
  canReviewForms: boolean;
  canReviewValidations: boolean;
  canViewFeedback: boolean;
  hasAnyRole: boolean;
  refreshRole: () => Promise<void>;
}

const RolesContext = createContext<RolesContextValue>({
  userRole: null,
  roleLoading: true,
  isOwner: false,
  canManageTeam: false,
  canManageExercises: false,
  canReviewForms: false,
  canReviewValidations: false,
  canViewFeedback: false,
  hasAnyRole: false,
  refreshRole: async () => {},
});

export function RolesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setUserRole(null);
      setRoleLoading(false);
      return;
    }

    // Fast path: owner email check (zero Firestore reads)
    if (user.email === OWNER_EMAIL) {
      setUserRole('owner');
      setRoleLoading(false);
      return;
    }

    // Fetch role from Firestore
    try {
      const snap = await getDoc(doc(getClientDb(), 'roles', user.uid));
      if (snap.exists()) {
        setUserRole(snap.data().role as UserRole);
      } else {
        setUserRole(null);
      }
    } catch (err) {
      console.error('[Roles] Failed to fetch role:', err);
      setUserRole(null);
    } finally {
      setRoleLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setRoleLoading(true);
    fetchRole();
  }, [authLoading, fetchRole]);

  const isOwner = userRole === 'owner';
  const canManageTeam = isOwner;
  const canManageExercises = isOwner || userRole === 'moderator' || userRole === 'exercise_manager';
  const canReviewForms = isOwner || userRole === 'moderator';
  const canReviewValidations = isOwner || userRole === 'moderator' || userRole === 'reviewer';
  const canViewFeedback = isOwner || userRole === 'moderator';
  const hasAnyRole = userRole !== null;

  return (
    <RolesContext value={{
      userRole,
      roleLoading,
      isOwner,
      canManageTeam,
      canManageExercises,
      canReviewForms,
      canReviewValidations,
      canViewFeedback,
      hasAnyRole,
      refreshRole: fetchRole,
    }}>
      {children}
    </RolesContext>
  );
}

export function useRoles() {
  return useContext(RolesContext);
}
