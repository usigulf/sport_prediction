/**
 * Complete sign-in after login or register — token, storage, profile, optional push.
 */
import { apiService, setAuthToken } from '../services/api';
import { setStoredAuth } from './authStorage';
import { setUser, fetchUserProfile } from '../store/slices/authSlice';
import { syncPushRegistrationAfterConsent } from './pushNotifications';
import type { AppDispatch } from '../store/store';
import { trackSignInCompleted } from '../services/productAnalytics';

export async function completeSignIn(
  dispatch: AppDispatch,
  email: string,
  password: string,
): Promise<void> {
  const response = await apiService.login(email, password);
  await applyAuthSession(dispatch, email, response.access_token, response.refresh_token, 'email');
}

export async function completeSignInWithTokens(
  dispatch: AppDispatch,
  tokens: { access_token: string; refresh_token: string },
  emailHint?: string,
): Promise<void> {
  await applyAuthSession(
    dispatch,
    emailHint,
    tokens.access_token,
    tokens.refresh_token,
    'password_reset',
  );
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
    'apple',
  );
}

async function applyAuthSession(
  dispatch: AppDispatch,
  emailHint: string | undefined,
  accessToken: string,
  refreshToken: string,
  signInMethod: 'email' | 'apple' | 'password_reset',
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
  const profile = await dispatch(fetchUserProfile()).unwrap().catch(() => null);
  try {
    void syncPushRegistrationAfterConsent();
  } catch {
    /* non-blocking */
  }
  if (profile?.id) {
    void trackSignInCompleted(signInMethod, profile.id, profile.subscription_tier);
  } else {
    void trackSignInCompleted(signInMethod);
  }
}
