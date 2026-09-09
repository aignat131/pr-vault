import type { Timestamp } from 'firebase/firestore';

export type ExerciseCategory = 'reps' | 'static' | 'weighted';
export type ExerciseUnit = 'reps' | 'sec' | 'kg';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  unit: ExerciseUnit;
}

export type Gender = 'male' | 'female';

export interface PRRecord {
  id?: string;
  userId: string;
  username: string;
  userAvatar?: string;
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  score: number;
  addedWeightKg?: number;
  videoUrl?: string;
  gender?: Gender;
  formVerified?: boolean;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  photoURL: string;
  bodyweightKg?: number;
}

// Predefined exercises for the app
export const EXERCISES: Exercise[] = [
  // Reps
  { id: 'pull-ups', name: 'Pull-ups', category: 'reps', unit: 'reps' },
  { id: 'push-ups', name: 'Push-ups', category: 'reps', unit: 'reps' },
  { id: 'dips', name: 'Dips', category: 'reps', unit: 'reps' },
  { id: 'muscle-ups', name: 'Muscle-ups', category: 'reps', unit: 'reps' },
  { id: 'pistol-squats', name: 'Pistol Squats', category: 'reps', unit: 'reps' },
  { id: 'chin-ups', name: 'Chin-ups', category: 'reps', unit: 'reps' },
  { id: 'diamond-push-ups', name: 'Diamond Push-ups', category: 'reps', unit: 'reps' },
  { id: 'hspu', name: 'HSPU', category: 'reps', unit: 'reps' },
  { id: 'toes-to-bar', name: 'Toes-to-Bar', category: 'reps', unit: 'reps' },
  { id: 'ring-dips', name: 'Ring Dips', category: 'reps', unit: 'reps' },
  { id: 'wide-pull-ups', name: 'Wide Pull-ups', category: 'reps', unit: 'reps' },
  { id: 'archer-pull-ups', name: 'Archer Pull-ups', category: 'reps', unit: 'reps' },
  { id: 'burpees', name: 'Burpees', category: 'reps', unit: 'reps' },
  { id: 'box-jumps', name: 'Box Jumps', category: 'reps', unit: 'reps' },
  // Static
  { id: 'handstand-hold', name: 'Handstand Hold', category: 'static', unit: 'sec' },
  { id: 'front-lever', name: 'Front Lever', category: 'static', unit: 'sec' },
  { id: 'back-lever', name: 'Back Lever', category: 'static', unit: 'sec' },
  { id: 'planche-hold', name: 'Planche Hold', category: 'static', unit: 'sec' },
  { id: 'l-sit', name: 'L-Sit', category: 'static', unit: 'sec' },
  { id: 'dead-hang', name: 'Dead Hang', category: 'static', unit: 'sec' },
  { id: 'active-hang', name: 'Active Hang', category: 'static', unit: 'sec' },
  { id: 'elbow-lever', name: 'Elbow Lever', category: 'static', unit: 'sec' },
  { id: 'dragon-flag-hold', name: 'Dragon Flag Hold', category: 'static', unit: 'sec' },
  { id: 'human-flag', name: 'Human Flag', category: 'static', unit: 'sec' },
  // Weighted
  { id: 'weighted-pull-ups', name: 'Weighted Pull-ups', category: 'weighted', unit: 'kg' },
  { id: 'weighted-dips', name: 'Weighted Dips', category: 'weighted', unit: 'kg' },
  { id: 'weighted-muscle-ups', name: 'Weighted Muscle-ups', category: 'weighted', unit: 'kg' },
  { id: 'weighted-chin-ups', name: 'Weighted Chin-ups', category: 'weighted', unit: 'kg' },
  { id: 'weighted-squats', name: 'Weighted Squats', category: 'weighted', unit: 'kg' },
  { id: 'weighted-push-ups', name: 'Weighted Push-ups', category: 'weighted', unit: 'kg' },
];
