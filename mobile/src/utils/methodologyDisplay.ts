import { PRODUCT_SCOPE_LONG_DESCRIPTION } from '../constants/leagues';

/**
 * Client-authored accuracy methodology (4.1a-safe, no API vendor/league leakage).
 * Ignores legacy API detail that may include prediction_type= or product scope duplicates.
 */
export const ACCURACY_METHODOLOGY_DETAIL = [
  'For finished games we compare the first pre-kickoff prediction to the final score. Live in-play refreshes are excluded.',
  'Soccer uses implied draw probability (1X2) alongside home and away. Other sports use the predicted favorite versus the actual winner.',
  'Confidence buckets show how often each label was right — not betting or trading performance.',
  PRODUCT_SCOPE_LONG_DESCRIPTION,
].join(' ');
