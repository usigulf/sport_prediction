import { AUTH_TAB_A11Y, GUEST_TAB_A11Y } from './tabAccessibility';

describe('tabAccessibility', () => {
  it('defines auth and guest tab VoiceOver labels', () => {
    expect(AUTH_TAB_A11Y.Home).toMatch(/Home tab/);
    expect(AUTH_TAB_A11Y.LiveHub).toMatch(/Live tab/);
    expect(GUEST_TAB_A11Y.Profile).toMatch(/Account tab/);
    expect(Object.keys(AUTH_TAB_A11Y)).toHaveLength(5);
    expect(Object.keys(GUEST_TAB_A11Y)).toHaveLength(3);
  });
});
