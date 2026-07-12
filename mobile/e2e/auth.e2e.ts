/**
 * Login / register screen entry (no live credentials required).
 */
import { launchFreshApp, openDeepLink } from './helpers';

describe('Auth screens', () => {
  beforeAll(async () => {
    await launchFreshApp();
  });

  it('opens login via deep link', async () => {
    await openDeepLink('login');
    await expect(element(by.id('login-screen'))).toBeVisible();
    await expect(element(by.id('login-submit'))).toBeVisible();
  });

  it('opens register via deep link', async () => {
    await openDeepLink('register');
    await expect(element(by.id('register-screen'))).toBeVisible();
    await expect(element(by.id('register-submit'))).toBeVisible();
  });
});
