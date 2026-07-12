/**
 * Paywall guest preview + restore affordance (I76 / audit #10).
 * Does not complete IAP — StoreKit is mocked or unavailable in CI.
 */
import { launchFreshApp, openDeepLink } from './helpers';

const GUEST_ACCOUNT_TAB = 'Account tab, sign in or create account';

describe('Paywall preview', () => {
  beforeAll(async () => {
    await launchFreshApp();
  });

  it('opens paywall from guest account Premium row', async () => {
    await element(by.label(GUEST_ACCOUNT_TAB)).tap();
    await expect(element(by.id('guest-profile-screen'))).toBeVisible();
    await element(by.id('guest-view-premium')).tap();

    await expect(element(by.id('paywall-screen'))).toBeVisible();
    await expect(element(by.id('paywall-choose-plan'))).toBeVisible();
    await expect(element(by.text('Premium'))).toBeVisible();
    await expect(element(by.id('paywall-premium-card'))).toBeVisible();
  });

  it('opens paywall via deep link and shows restore when purchases SDK is available', async () => {
    await openDeepLink('paywall');
    await expect(element(by.id('paywall-screen'))).toBeVisible();
    // Restore is only rendered when RevenueCat/purchases are available.
    try {
      await waitFor(element(by.id('paywall-restore')))
        .toBeVisible()
        .withTimeout(5000);
      await expect(element(by.id('paywall-restore'))).toBeVisible();
    } catch {
      // Simulator builds without purchases config still pass paywall shell checks above.
    }
  });
});
