export const OWNER_EMAIL = 'aignat131@gmail.com';
export const ADMIN_EMAIL = OWNER_EMAIL; // backward compat alias

export const MAX_ACTIVE_VALIDATIONS = 3;

export const STORAGE_KEYS = {
  GENDER: 'pr-vault-user-gender',
  FAVORITES: 'pr-vault-favorite-exercises',
  ONBOARDING_COMPLETE: 'pr-vault-onboarding-complete',
  SHOWCASE: 'pr-vault-showcase-exercises',
  WEIGHT_UNIT: 'pr-vault-weight-unit',
  LEADERBOARD_GENDER: 'pr-vault-leaderboard-gender',
} as const;
