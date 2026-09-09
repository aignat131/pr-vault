'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
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
      const snap = await getDocs(collection(getClientDb(), 'exercises'));
      if (snap.empty) {
        setExercises(DEFAULT_EXERCISES);
        return;
      }
      const custom = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
        category: d.data().category as Exercise['category'],
        unit: d.data().unit as Exercise['unit'],
      }));
      const defaultIds = new Set(DEFAULT_EXERCISES.map((e) => e.id));
      setExercises([...DEFAULT_EXERCISES, ...custom.filter((c) => !defaultIds.has(c.id))]);
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
