/**
 * End the local session completely — storage, API token, RevenueCat, Redux.
 * Clears local state first so the UI responds immediately; server revoke is best-effort.
 */
import { apiService, getAuthSessionGeneration, setAuthToken } from '../services/api';
import { clearStoredAuth, getStoredAuth, type StoredAuth } from './authStorage';
import { logOutPurchases } from '../services/purchases';
import { logout } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/store';

let signOutInProgress = false;

async function revokeRemoteSession(stored: StoredAuth | null): Promise<void> {
  try {
    if (stored?.accessToken) {
      setAuthToken(stored.accessToken);
      await apiService.logout(stored.refreshToken, stored.accessToken);
    }
  } catch {
    /* server revoke is best-effort */
  } finally {
    setAuthToken(null);
  }
  try {
    await logOutPurchases();
  } catch {
    /* non-fatal */
  }
}

export async function signOut(dispatch: AppDispatch): Promise<void> {
  if (signOutInProgress) return;
  signOutInProgress = true;
  const generationAtStart = getAuthSessionGeneration();
  try {
    // Read tokens before clearing, but never block the UI on SecureStore I/O.
    const stored = await getStoredAuth().catch(() => null);
    if (generationAtStart !== getAuthSessionGeneration()) {
      return;
    }
    setAuthToken(null);
    dispatch(logout());
    void clearStoredAuth().catch(() => {});
    void revokeRemoteSession(stored);
  } finally {
    signOutInProgress = false;
  }
}
