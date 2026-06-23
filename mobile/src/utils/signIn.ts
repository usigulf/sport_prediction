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
  await applyAuthSession(dispatch, email, response.access_token, response.refresh_token);
}

export type AppleSignInPayload = {
  identityToken: string;
  email?: string;
  fullName?: string;
};

export async function completeAppleSignIn(
  dispatch: AppDispatch,
  payload: AppleSignInPayload,
): Promise<void> {
  const response = await apiService.loginWithApple({
    identity_token: payload.identityToken,
    email: payload.email,
    full_name: payload.fullName,
  });
  await applyAuthSession(
    dispatch,
    payload.email,
    response.access_token,
    response.refresh_token,
  );
}

async function applyAuthSession(
  dispatch: AppDispatch,
  emailHint: string | undefined,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  setAuthToken(accessToken);
  let email = emailHint;
  if (!email) {
    try {
      email = (await apiService.getCurrentUser()).email;
    } catch {
      email = 'user@octobetiq.com';
    }
  }
  dispatch(setUser({ email, token: accessToken }));
  try {
    await setStoredAuth({
      accessToken,
      refreshToken,
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
