'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { EXERCISES as DEFAULT_EXERCISES, type Exercise } from '@/types';

interface ExercisesContextValue {
  exercises: Exercise[];
  refreshExercises: () => Promise<void>;
}

const ExercisesContext = createContext<ExercisesContextValue>({
  exercises: DEFAULT_EXERCISES,
  refreshExercises: async () => {},
});

export function ExercisesProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);

  const loadExercises = useCallback(async () => {
    try {
      // Load hidden exercise IDs
      let hiddenIds = new Set<string>();
      try {
        const configSnap = await getDoc(doc(getClientDb(), 'config', 'exercises'));
        if (configSnap.exists()) {
          const data = configSnap.data();
          if (Array.isArray(data.hiddenIds)) {
            hiddenIds = new Set(data.hiddenIds);
          }
        }
      } catch {
        // ignore — config doc may not exist yet
      }

      // Load custom exercises
      const snap = await getDocs(collection(getClientDb(), 'exercises'));
      const custom = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
        category: d.data().category as Exercise['category'],
        unit: d.data().unit as Exercise['unit'],
      }));

      // Merge: (defaults - hidden) + custom
      const defaultIds = new Set(DEFAULT_EXERCISES.map((e) => e.id));
      const visibleDefaults = DEFAULT_EXERCISES.filter((e) => !hiddenIds.has(e.id));
      const newCustom = custom.filter((c) => !defaultIds.has(c.id));
      setExercises([...visibleDefaults, ...newCustom]);
    } catch {
      // fallback to defaults
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  return (
    <ExercisesContext value={{ exercises, refreshExercises: loadExercises }}>
      {children}
    </ExercisesContext>
  );
}

export function useExercises() {
  return useContext(ExercisesContext).exercises;
}

export function useExercisesContext() {
  return useContext(ExercisesContext);
}
