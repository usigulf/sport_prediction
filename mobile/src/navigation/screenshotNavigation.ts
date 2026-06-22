/**
 * Programmatic navigation for App Store screenshots.
 * Driven by: com.sportsprediction.app://capture/home
 */
import { CommonActions } from '@react-navigation/native';
import { store } from '../store/store';
import { navigationRef } from './navigationRef';

const TAB_INDEX = {
  Home: 0,
  LiveHub: 1,
  Games: 2,
  Favorites: 3,
  Profile: 4,
} as const;

type TabName = keyof typeof TAB_INDEX;

const ALL_TAB_ROUTES = (
  ['Home', 'LiveHub', 'Games', 'Favorites', 'Profile'] as const
).map((name) => ({ name }));

function tabState(active: TabName, gamesLeague?: string) {
  return {
    index: TAB_INDEX[active],
    routes: ALL_TAB_ROUTES.map((r) =>
      r.name === 'Games' && gamesLeague
        ? { name: 'Games' as const, params: { league: gamesLeague } }
        : { name: r.name },
    ),
  };
}

function waitForNavigationReady(): Promise<void> {
  return new Promise((resolve) => {
    if (navigationRef.isReady()) {
      resolve();
      return;
    }
    const started = Date.now();
    const tick = setInterval(() => {
      if (navigationRef.isReady() || Date.now() - started > 10000) {
        clearInterval(tick);
        resolve();
      }
    }, 50);
  });
}

function goToTab(screen: TabName, gamesLeague?: string) {
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          state: tabState(screen, gamesLeague),
        },
      ],
    }),
  );
}

function goToStackScreen(
  screen: 'Paywall' | 'Leaderboards' | 'Accuracy' | 'GameDetail',
  params?: { gameId: string },
) {
  navigationRef.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [
        {
          name: 'MainTabs',
          state: tabState('Home'),
        },
        {
          name: screen,
          params,
        },
      ],
    }),
  );
}

export function captureRoutesEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_APP_STORE_CAPTURE === 'true') return true;
  return typeof __DEV__ === 'boolean' && __DEV__;
}

/** Navigate for a capture/* path segment (without prefix). */
export async function navigateScreenshotRoute(route: string): Promise<void> {
  await waitForNavigationReady();
  if (!navigationRef.isReady()) {
    throw new Error('Navigation not ready');
  }

  const authed = store.getState().auth.isAuthenticated;

  switch (route) {
    case 'logout': {
      const { signOut } = await import('../utils/signOut');
      await signOut(store.dispatch);
      await new Promise((r) => setTimeout(r, 2000));
      return;
    }
    case 'landing': {
      if (authed) {
        const { signOut } = await import('../utils/signOut');
        await signOut(store.dispatch);
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!store.getState().auth.isAuthenticated) {
        navigationRef.dispatch(CommonActions.navigate('Landing'));
      }
      return;
    }
    case 'accuracy':
      if (authed) {
        goToStackScreen('Accuracy');
      } else {
        navigationRef.dispatch(CommonActions.navigate('Accuracy'));
      }
      return;
    case 'home':
      if (!authed) throw new Error('Not signed in — log in on the simulator first');
      goToTab('Home');
      return;
    case 'games':
      if (!authed) throw new Error('Not signed in');
      goToTab('Games', 'premier_league');
      return;
    case 'trending':
      if (!authed) throw new Error('Not signed in');
      goToTab('LiveHub');
      return;
    case 'favorites':
      if (!authed) throw new Error('Not signed in');
      goToTab('Favorites');
      return;
    case 'profile':
      if (!authed) throw new Error('Not signed in');
      goToTab('Profile');
      return;
    case 'login': {
      const email = process.env.EXPO_PUBLIC_CAPTURE_LOGIN_EMAIL;
      const password = process.env.EXPO_PUBLIC_CAPTURE_LOGIN_PASSWORD;
      if (!email || !password) {
        throw new Error(
          'Set EXPO_PUBLIC_CAPTURE_LOGIN_EMAIL and EXPO_PUBLIC_CAPTURE_LOGIN_PASSWORD in Metro env',
        );
      }
      const { completeSignIn } = await import('../utils/signIn');
      await completeSignIn(store.dispatch, email, password);
      await new Promise((r) => setTimeout(r, 2500));
      return;
    }
    case 'paywall':
      if (!authed) {
        if (!captureRoutesEnabled()) throw new Error('Not signed in');
        navigationRef.dispatch(CommonActions.navigate('Paywall'));
      } else {
        goToStackScreen('Paywall');
      }
      return;
    case 'leaderboards':
      if (!authed) throw new Error('Not signed in');
      goToStackScreen('Leaderboards');
      return;
    default: {
      const gameMatch = route.match(/^game\/(.+)$/);
      if (gameMatch && authed) {
        goToStackScreen('GameDetail', { gameId: gameMatch[1] });
        return;
      }
      throw new Error(`Unknown capture route: ${route}`);
    }
  }
}

export async function handleScreenshotDeepLink(url: string): Promise<boolean> {
  if (!captureRoutesEnabled()) return false;

  const m = url.match(/:\/\/\/?([^?#]+)/);
  if (!m) return false;
  const path = m[1].replace(/\/$/, '');
  if (!path.startsWith('capture/')) return false;

  const route = path.slice('capture/'.length);
  try {
    await navigateScreenshotRoute(route);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[screenshot] navigated → capture/${route}`);
    }
    return true;
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[screenshot] capture/${route} failed:`, e);
    }
    return false;
  }
}
