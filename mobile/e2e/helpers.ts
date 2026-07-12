/**
 * Shared Detox helpers for fresh-install gates and deep links.
 */

export const APP_SCHEME = 'com.sportsprediction.app://';

/** Wait until an element is visible, or resolve false after timeout. */
export async function waitForId(
  testID: string,
  timeoutMs = 8000,
): Promise<boolean> {
  try {
    await waitFor(element(by.id(testID)))
      .toBeVisible()
      .withTimeout(timeoutMs);
    return true;
  } catch {
    return false;
  }
}

/**
 * Complete first-run age + privacy screens when present.
 * Safe to call after every cold launch with delete:true.
 */
export async function completeFirstRunGates(): Promise<void> {
  if (await waitForId('age-gate-screen', 12000)) {
    await element(by.id('age-gate-continue')).tap();
  }
  if (await waitForId('privacy-consent-screen', 12000)) {
    await element(by.id('privacy-consent-continue')).tap();
  }
}

/**
 * Cold-launch a clean app instance (clears AsyncStorage / age+privacy prefs).
 */
export async function launchFreshApp(options?: {
  url?: string;
  skipGates?: boolean;
}): Promise<void> {
  await device.launchApp({
    newInstance: true,
    delete: true,
    url: options?.url,
  });
  if (!options?.skipGates) {
    await completeFirstRunGates();
  }
}

/**
 * Re-launch without wiping storage (gates already completed).
 */
export async function relaunchApp(url?: string): Promise<void> {
  await device.launchApp({
    newInstance: true,
    url,
  });
}

export async function openDeepLink(path: string): Promise<void> {
  const normalized = path.replace(/^\//, '');
  await device.openURL({ url: `${APP_SCHEME}${normalized}` });
}
