/**
 * First-run age gate + privacy consent (external audit #10).
 */
import { launchFreshApp, waitForId } from './helpers';

describe('First-run gates', () => {
  it('shows age gate then privacy consent on fresh install', async () => {
    await launchFreshApp({ skipGates: true });

    await expect(element(by.id('age-gate-screen'))).toBeVisible();
    await element(by.id('age-gate-continue')).tap();

    await expect(element(by.id('privacy-consent-screen'))).toBeVisible();
    await expect(element(by.id('privacy-analytics-switch'))).toBeVisible();
    await expect(element(by.id('privacy-ads-switch'))).toBeVisible();
    await element(by.id('privacy-consent-continue')).tap();

    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('does not re-show gates after consent is saved', async () => {
    await launchFreshApp();
    await expect(element(by.id('home-screen'))).toBeVisible();

    await device.launchApp({ newInstance: true });
    const ageAgain = await waitForId('age-gate-screen', 3000);
    expect(ageAgain).toBe(false);
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
