/**
 * RevenueCat (react-native-purchases) wrapper — the App Store / Play Billing
 * compliant in-app purchase path. Safe on web / Expo Go: every export no-ops
 * when the native module or a configured API key is unavailable, so callers can
 * fall back to web (Stripe) checkout.
 *
 * Entitlement identifiers (configurable via app config `extra`):
 *   - premium  → app tier `premium`
 *   - pro (legacy) → app tier `premium`
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  normalizeSubscriptionTier,
  type NormalizedTier,
} from '../utils/subscription';

type PurchasesModule = typeof import('react-native-purchases');
type CustomerInfo = import('react-native-purchases').CustomerInfo;
type PurchasesPackage = import('react-native-purchases').PurchasesPackage;

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

let cached: PurchasesModule | null | undefined;

function loadPurchases(): PurchasesModule | null {
  if (!SUPPORTED) return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-purchases') as PurchasesModule;
  } catch {
    cached = null;
  }
  return cached;
}

function extra(): Record<string, string | undefined> {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
}

const entPro = (): string => extra().revenueCatEntitlementPro || 'pro';
const entPremium = (): string => extra().revenueCatEntitlementPremium || 'premium';

function apiKey(): string | null {
  const e = extra();
  const key = Platform.OS === 'ios' ? e.revenueCatIosKey : e.revenueCatAndroidKey;
  const trimmed = key?.trim();
  if (!trimmed || trimmed.length < 12) return null;
  // Placeholder from docs/setup — configuring with this crashes the native SDK.
  if (/YOUR_KEY|XXXX|placeholder/i.test(trimmed)) return null;
  const prefix = Platform.OS === 'ios' ? 'appl_' : 'goog_';
  if (!trimmed.startsWith(prefix) && !trimmed.startsWith('test_')) return null;
  return trimmed;
}

/** True only when the native SDK is present AND a key is configured. */
export function isPurchasesAvailable(): boolean {
  return loadPurchases() != null && apiKey() != null;
}

let configured = false;
/** True after RC is associated with an app user id (not anonymous). */
let linkedToAppUser = false;

/** Configure once at startup; call again with a user id after login to associate purchases. */
export async function configurePurchases(appUserId?: string): Promise<void> {
  const m = loadPurchases();
  const key = apiKey();
  if (!m || !key) return;
  try {
    if (!configured) {
      m.default.configure({ apiKey: key, appUserID: appUserId });
      configured = true;
      linkedToAppUser = Boolean(appUserId);
    } else if (appUserId) {
      await m.default.logIn(appUserId);
      linkedToAppUser = true;
    }
  } catch {
    /* non-fatal — features fall back to web checkout */
  }
}

/** Disassociate the device from the user on logout (anonymous id afterwards). */
export async function logOutPurchases(): Promise<void> {
  const m = loadPurchases();
  if (!m || !configured || !linkedToAppUser) return;
  try {
    await m.default.logOut();
  } catch {
    /* ignore */
  } finally {
    linkedToAppUser = false;
  }
}

export function tierFromCustomerInfo(info: CustomerInfo | null | undefined): NormalizedTier {
  if (!info) return 'free';
  const active = info.entitlements?.active ?? {};
  if (active[entPremium()]) return 'premium';
  if (active[entPro()]) return 'premium';
  return 'free';
}

/** Current entitlement-derived tier, or 'free' when unavailable. */
export async function getEntitlementTier(): Promise<NormalizedTier> {
  const m = loadPurchases();
  if (!m || !configured) return 'free';
  try {
    return tierFromCustomerInfo(await m.default.getCustomerInfo());
  } catch {
    return 'free';
  }
}

export interface OfferingPackage {
  identifier: string;
  priceString: string;
  /** Best-effort tier inferred from product/package naming. */
  tier: NormalizedTier;
  raw: PurchasesPackage;
}

function tierForPackage(pkg: PurchasesPackage): NormalizedTier {
  const hay = `${pkg.identifier} ${pkg.product?.identifier ?? ''}`.toLowerCase();
  return 'premium';
}

/** Packages from the current offering. Empty when RC isn't configured/available. */
export async function getOfferingPackages(): Promise<OfferingPackage[]> {
  const m = loadPurchases();
  if (!m || !configured) return [];
  try {
    const offerings = await m.default.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return current.availablePackages.map((p) => ({
      identifier: p.identifier,
      priceString: p.product?.priceString ?? '',
      tier: tierForPackage(p),
      raw: p,
    }));
  } catch {
    return [];
  }
}

export interface PurchaseResult {
  tier: NormalizedTier;
  cancelled: boolean;
}

/** Purchase a package. Resolves with the resulting entitlement tier. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  const m = loadPurchases();
  if (!m || !configured) return { tier: 'free', cancelled: false };
  try {
    const { customerInfo } = await m.default.purchasePackage(pkg);
    return { tier: tierFromCustomerInfo(customerInfo), cancelled: false };
  } catch (e) {
    const cancelled = Boolean((e as { userCancelled?: boolean })?.userCancelled);
    if (cancelled) return { tier: 'free', cancelled: true };
    throw e;
  }
}

/** Restore prior purchases (App Store requirement). Resolves with restored tier. */
export async function restorePurchases(): Promise<NormalizedTier> {
  const m = loadPurchases();
  if (!m || !configured) return 'free';
  const info = await m.default.restorePurchases();
  return tierFromCustomerInfo(info);
}

/**
 * Subscribe to entitlement changes (renewals, expirations from the store).
 * Returns an unsubscribe function. No-op when unavailable.
 */
export function addEntitlementListener(
  cb: (tier: NormalizedTier) => void,
): () => void {
  const m = loadPurchases();
  if (!m || !configured) return () => {};
  const handler = (info: CustomerInfo) => cb(tierFromCustomerInfo(info));
  try {
    m.default.addCustomerInfoUpdateListener(handler);
  } catch {
    return () => {};
  }
  return () => {
    try {
      m.default.removeCustomerInfoUpdateListener(handler);
    } catch {
      /* ignore */
    }
  };
}

export { normalizeSubscriptionTier };
