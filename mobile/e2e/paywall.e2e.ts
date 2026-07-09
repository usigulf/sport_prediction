/**
 * Detox E2E skeleton — paywall guest preview (Imp #76).
 * Requires Detox build; run via `npx detox test`.
 */
describe('Paywall preview', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('shows Premium plans for guest browse', async () => {
    await expect(element(by.text('Premium'))).toBeVisible();
    await expect(element(by.text('Choose your plan'))).toBeVisible();
  });

  it('shows premium subscription card', async () => {
    await expect(element(by.id('paywall-premium-card'))).toBeVisible();
  });
});
