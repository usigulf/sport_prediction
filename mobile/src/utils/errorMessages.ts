/**
 * Maps API and network errors to user-friendly messages for alerts and inline UI.
 */
export function getUserFriendlyMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  const status = (error as { status?: number })?.status;

  // Backend detail strings (exact or contains)
  if (typeof msg === 'string') {
    if (/email already registered/i.test(msg)) {
      return 'This email is already registered. Try signing in.';
    }
    if (/incorrect email or password|invalid email or password/i.test(msg)) {
      return 'Invalid email or password.';
    }
    if (/invalid (authentication )?credentials|invalid refresh token|user not found/i.test(msg)) {
      return 'Session expired. Please sign in again.';
    }
    if (/daily prediction limit reached/i.test(msg)) {
      return 'Daily prediction limit reached. Upgrade to Premium for more.';
    }
    if (/live predictions require|premium subscription/i.test(msg)) {
      return 'This feature requires a Premium subscription.';
    }
    if (/prediction not found/i.test(msg)) {
      return 'No prediction available for this game.';
    }
    if (/game not found/i.test(msg)) {
      return 'Game not found.';
    }
    if (/team not found/i.test(msg)) {
      return 'Team not found.';
    }
    if (/favorite not found/i.test(msg)) {
      return 'Favorite not found.';
    }
    if (/invalid (team|game) id/i.test(msg)) {
      return 'Invalid ID. Please try again.';
    }
    // Keep network/backend hints as-is (already user-facing)
    if (/cannot reach|timed out|start the backend/i.test(msg)) {
      return msg;
    }
  }

  // Status-based fallbacks when message is generic
  if (status === 401) {
    return 'Session expired. Please sign in again.';
  }
  if (status === 403) {
    return "You don't have access. Upgrade to Premium for more.";
  }
  if (status === 404) {
    return 'Not found.';
  }
  if (status === 429) {
    return 'Too many requests. Please try again in a minute.';
  }
  if (status === 422) {
    return 'Please check your input and try again.';
  }

  if (msg && msg.length > 0 && msg.length < 120) {
    return msg;
  }
  return 'Something went wrong. Please try again.';
}
