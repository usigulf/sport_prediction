/**
 * Guest value path: home → account → register / paywall entry.
 */
import { launchFreshApp, openDeepLink } from './helpers';

const GUEST_ACCOUNT_TAB = 'Account tab, sign in or create account';

describe('Guest value path', () => {
  beforeAll(async () => {
    await launchFreshApp();
  });

  it('lands on home with guest browse', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.text('Welcome to octobetiQ'))).toBeVisible();
  });

  it('opens guest account tab with sign-up and premium entry', async () => {
    await element(by.label(GUEST_ACCOUNT_TAB)).tap();
    await expect(element(by.id('guest-profile-screen'))).toBeVisible();
    await expect(element(by.id('guest-create-account'))).toBeVisible();
    await expect(element(by.id('guest-view-premium'))).toBeVisible();
  });

  it('navigates to register from guest account', async () => {
    await element(by.id('guest-create-account')).tap();
    await expect(element(by.id('register-screen'))).toBeVisible();
    await expect(element(by.id('register-submit'))).toBeVisible();
  });

  it('opens landing via deep link', async () => {
    await openDeepLink('landing');
    await expect(element(by.id('landing-screen'))).toBeVisible();
    await expect(element(by.id('landing-get-free-picks'))).toBeVisible();
  });
});
