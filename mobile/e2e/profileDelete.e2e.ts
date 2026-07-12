/**
 * Account deletion entry (authenticated Profile only).
 *
 * Without DETOX_E2E_EMAIL / DETOX_E2E_PASSWORD, asserts the control is wired
 * in source (verify_detox_scaffold.sh) and that guest account has no delete CTA.
 */
import { launchFreshApp } from './helpers';

const GUEST_ACCOUNT_TAB = 'Account tab, sign in or create account';
const AUTH_PROFILE_TAB = 'Profile tab, account and settings';

describe('Account delete entry', () => {
  beforeAll(async () => {
    await launchFreshApp();
  });

  it('guest account tab does not expose delete account', async () => {
    await element(by.label(GUEST_ACCOUNT_TAB)).tap();
    await expect(element(by.id('guest-profile-screen'))).toBeVisible();
    await expect(element(by.id('profile-delete-account'))).not.toExist();
  });

  const email = process.env.DETOX_E2E_EMAIL;
  const password = process.env.DETOX_E2E_PASSWORD;

  (email && password ? it : it.skip)(
    'authenticated profile shows delete account control',
    async () => {
      await device.openURL({ url: 'com.sportsprediction.app://login' });
      await expect(element(by.id('login-screen'))).toBeVisible();
      await element(by.id('login-screen')).tap();
      const fields = element(by.type('RCTUITextField'));
      await fields.atIndex(0).typeText(email!);
      await fields.atIndex(1).typeText(password!);
      await element(by.id('login-submit')).tap();

      await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(20000);
      await element(by.label(AUTH_PROFILE_TAB)).tap();
      await expect(element(by.id('profile-screen'))).toBeVisible();
      await expect(element(by.id('profile-delete-account'))).toBeVisible();
    },
  );
});
