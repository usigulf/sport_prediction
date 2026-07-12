/**
 * Game detail deep link (missing game still mounts screen shell).
 */
import { launchFreshApp, openDeepLink } from './helpers';

describe('Game detail', () => {
  beforeAll(async () => {
    await launchFreshApp();
  });

  it('opens game detail route via deep link', async () => {
    await openDeepLink('game/e2e-fixture-game-id');
    await expect(element(by.id('game-detail-screen'))).toBeVisible();
  });
});
