/**
 * Complete sign-in after login or register — token, storage, profile, optional push.
 */
import { apiService, setAuthToken } from '../services/api';
import { setStoredAuth } from './authStorage';
import { setUser, fetchUserProfile } from '../store/slices/authSlice';
import { registerPushTokenIfPossible } from './pushNotifications';
import { getPushNotificationsEnabled } from './settingsStorage';
import type { AppDispatch } from '../store/store';

export async function completeSignIn(
  dispatch: AppDispatch,
  email: string,
  password: string,
): Promise<void> {
  const response = await apiService.login(email, password);
  setAuthToken(response.access_token);
  dispatch(setUser({ email, token: response.access_token }));
  try {
    await setStoredAuth({
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      email,
    });
  } catch {
    /* non-blocking */
  }
  await dispatch(fetchUserProfile()).unwrap().catch(() => {});
  try {
    const pushEnabled = await getPushNotificationsEnabled();
    if (pushEnabled) registerPushTokenIfPossible();
  } catch {
    /* non-blocking */
  }
}
