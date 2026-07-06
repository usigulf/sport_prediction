/**
 * Deep links for dev client and App Store screenshot automation.
 * Native URL scheme: com.sportsprediction.app (see ios/octobetiQ/Info.plist).
 */
import {
  getStateFromPath as defaultGetStateFromPath,
  type LinkingOptions,
} from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

export const APP_URL_PREFIXES = ['com.sportsprediction.app://'];

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: APP_URL_PREFIXES,
  getStateFromPath(path, options) {
    if (path.startsWith('capture/') || path.startsWith('/capture/')) {
      return undefined;
    }
    return defaultGetStateFromPath(path, options);
  },
  config: {
    screens: {
      Landing: 'landing',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResetPassword: {
        path: 'reset-password',
        parse: {
          token: (token: string) => decodeURIComponent(token),
        },
      },
      Accuracy: 'accuracy',
      Help: 'help',
      Onboarding: 'onboarding',
      MainTabs: {
        path: '',
        screens: {
          Home: 'home',
          LiveHub: 'trending',
          Games: 'games',
          Favorites: 'favorites',
          Profile: 'profile',
        },
      },
      GameDetail: 'game/:gameId',
      Paywall: 'paywall',
      PredictionHistory: 'picks',
      Leaderboards: 'leaderboards',
      Challenges: 'challenges',
      Settings: 'settings',
      PrivacyPolicy: 'privacy',
      TermsOfService: 'terms',
    },
  },
};
