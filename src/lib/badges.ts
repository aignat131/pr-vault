import type { PRRecord } from '@/types';

export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export const BADGES: Badge[] = [
  // Milestone badges
  { id: 'first-pr', name: 'First Step', desc: 'Record your first PR', icon: 'Footprints' },
  { id: '10-prs', name: 'Dedicated', desc: 'Record 10 PRs', icon: 'Target' },
  { id: '25-prs', name: 'Committed', desc: 'Record 25 PRs', icon: 'Flame' },
  // Exercise-specific
  { id: 'muscle-up', name: 'Muscle-Up Club', desc: 'Record a muscle-up PR', icon: 'Zap' },
  { id: 'pull-20', name: '20 Pull-Up Club', desc: 'Hit 20+ pull-ups', icon: 'Crown' },
  { id: 'front-lever-10', name: 'Lever Master', desc: 'Hold front lever 10+ sec', icon: 'Timer' },
  { id: 'heavy-dipper', name: 'Heavy Dipper', desc: 'Weighted dip +30kg', icon: 'Dumbbell' },
  // Validation badges
  { id: 'first-validated', name: 'Verified Athlete', desc: 'Get a PR validated', icon: 'ShieldCheck' },
  { id: '3-validated', name: 'Proven', desc: 'Get 3 PRs validated', icon: 'Shield' },
  // Breadth
  { id: 'all-categories', name: 'All-Rounder', desc: 'Record PRs in all 3 categories', icon: 'Layers' },
];

export function evaluateBadges(records: PRRecord[]): string[] {
  const earned: string[] = [];
  const count = records.length;
  const categories = new Set(records.map((r) => r.category));
  const validatedCount = records.filter((r) => r.validated).length;

  // Milestone
  if (count >= 1) earned.push('first-pr');
  if (count >= 10) earned.push('10-prs');
  if (count >= 25) earned.push('25-prs');

  // Exercise-specific
  const prMap = new Map(records.map((r) => [r.exerciseId, r]));

  if (prMap.has('muscle-ups')) earned.push('muscle-up');

  const pullUps = prMap.get('pull-ups');
  if (pullUps && pullUps.score >= 20) earned.push('pull-20');

  const frontLever = prMap.get('front-lever');
  if (frontLever && frontLever.score >= 10) earned.push('front-lever-10');

  const weightedDips = prMap.get('weighted-dips');
  if (weightedDips && (weightedDips.addedWeightKg ?? 0) >= 30) earned.push('heavy-dipper');

  // Validation
  if (validatedCount >= 1) earned.push('first-validated');
  if (validatedCount >= 3) earned.push('3-validated');

  // Breadth
  if (categories.size >= 3) earned.push('all-categories');

  return earned;
}
