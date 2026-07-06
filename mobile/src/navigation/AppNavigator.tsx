/**
 * Main navigation for octobetiQ
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../store/hooks';
import { theme } from '../constants/theme';
import { getOnboardingComplete, setOnboardingComplete } from '../utils/onboardingStorage';
import { linking } from './linking';
import { navigationRef } from './navigationRef';
import { captureRoutesEnabled } from './screenshotNavigation';
import { AUTH_TAB_A11Y, GUEST_TAB_A11Y } from './tabAccessibility';

const skipOnboardingForCapture =
  process.env.EXPO_PUBLIC_APP_STORE_CAPTURE === 'true';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { GamesScreen } from '../screens/GamesScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { GameDetailScreen } from '../screens/GameDetailScreen';
import { PredictionHistoryScreen } from '../screens/PredictionHistoryScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { AccuracyScreen } from '../screens/AccuracyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/TermsOfServiceScreen';
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { LiveHubScreen } from '../screens/LiveHubScreen';
import { LeaderboardsScreen } from '../screens/LeaderboardsScreen';
import { ChallengesScreen } from '../screens/ChallengesScreen';
import { CreateChallengeScreen } from '../screens/CreateChallengeScreen';
import { ChallengeDetailScreen } from '../screens/ChallengeDetailScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { GuestProfileScreen } from '../screens/GuestProfileScreen';
import { trackScreenView } from '../services/productAnalytics';

// Types
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  GameDetail: { gameId: string };
  PredictionHistory: undefined;
  /** Params optional — can navigate('Paywall') or pass emphasis/context. */
  Paywall: { emphasizeTier?: 'premium'; contextMessage?: string } | undefined;
  Accuracy: undefined;
  Leaderboards: undefined;
  Challenges: undefined;
  CreateChallenge: undefined;
  ChallengeDetail: { challengeId: string };
  Settings: undefined;
  Help: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  LiveHub: undefined;
  Games: { league?: string } | undefined;
  Favorites: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function GuestTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Games') {
            iconName = focused ? 'football' : 'football-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          );
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundElevated,
          borderTopColor: theme.colors.borderSubtle,
        },
        headerStyle: {
          backgroundColor: theme.colors.backgroundElevated,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarAccessibilityLabel: GUEST_TAB_A11Y.Home }}
      />
      <Tab.Screen
        name="Games"
        component={GamesScreen}
        options={{ title: 'Games', tabBarAccessibilityLabel: GUEST_TAB_A11Y.Games }}
      />
      <Tab.Screen
        name="Profile"
        component={GuestProfileScreen}
        options={{ title: 'Account', tabBarAccessibilityLabel: GUEST_TAB_A11Y.Profile }}
      />
    </Tab.Navigator>
  );
}

function GuestStack() {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.backgroundElevated,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="MainTabs" component={GuestTabs} options={{ headerShown: false }} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Game Details' }} />
      <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Forgot Password' }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: 'Reset Password' }}
      />
      <Stack.Screen name="Accuracy" component={AccuracyScreen} options={{ title: 'Model accuracy' }} />
      <Stack.Screen name="Help" component={HelpScreen} options={{ title: 'Help & FAQ' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ title: 'Subscription' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'LiveHub') {
            iconName = focused ? 'pulse' : 'pulse-outline';
          } else if (route.name === 'Games') {
            iconName = focused ? 'football' : 'football-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          );
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundElevated,
          borderTopColor: theme.colors.borderSubtle,
        },
        headerStyle: {
          backgroundColor: theme.colors.backgroundElevated,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarAccessibilityLabel: AUTH_TAB_A11Y.Home }}
      />
      <Tab.Screen
        name="LiveHub"
        component={LiveHubScreen}
        options={{ title: 'Live', tabBarAccessibilityLabel: AUTH_TAB_A11Y.LiveHub }}
      />
      <Tab.Screen
        name="Games"
        component={GamesScreen}
        options={{ title: 'Games', tabBarAccessibilityLabel: AUTH_TAB_A11Y.Games }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favorites', tabBarAccessibilityLabel: AUTH_TAB_A11Y.Favorites }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarAccessibilityLabel: AUTH_TAB_A11Y.Profile }}
      />
    </Tab.Navigator>
  );
}

function AuthenticatedStack({ showOnboarding }: { showOnboarding: boolean }) {
  return (
    <Stack.Navigator
      initialRouteName={showOnboarding ? 'Onboarding' : 'MainTabs'}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.backgroundElevated,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          cardStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GameDetail"
        component={GameDetailScreen}
        options={{ title: 'Game Details' }}
      />
            <Stack.Screen
              name="PredictionHistory"
              component={PredictionHistoryScreen}
              options={{ title: 'My Picks' }}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{ title: 'Subscription' }}
            />
            <Stack.Screen
              name="Accuracy"
              component={AccuracyScreen}
              options={{ title: 'Model accuracy' }}
            />
            <Stack.Screen
              name="Leaderboards"
              component={LeaderboardsScreen}
              options={{ title: 'Leaderboard' }}
            />
            <Stack.Screen
              name="Challenges"
              component={ChallengesScreen}
              options={{ title: 'Challenges' }}
            />
            <Stack.Screen
              name="CreateChallenge"
              component={CreateChallengeScreen}
              options={{ title: 'Create challenge' }}
            />
            <Stack.Screen
              name="ChallengeDetail"
              component={ChallengeDetailScreen}
              options={{ title: 'Challenge' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="Help"
              component={HelpScreen}
              options={{ title: 'Help & FAQ' }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ title: 'Privacy Policy' }}
            />
            <Stack.Screen
              name="TermsOfService"
              component={TermsOfServiceScreen}
              options={{ title: 'Terms of Service' }}
            />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setOnboardingChecked(false);
      setShowOnboarding(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (skipOnboardingForCapture) {
        await setOnboardingComplete().catch(() => {});
      }
      const done = skipOnboardingForCapture
        ? true
        : await getOnboardingComplete();
      if (!cancelled) {
        setShowOnboarding(!done);
        setOnboardingChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const navigationKey = isAuthenticated ? 'authenticated' : 'guest';
  const routeNameRef = useRef<string | undefined>(undefined);

  return (
    <NavigationContainer
      key={navigationKey}
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        routeNameRef.current = navigationRef.getCurrentRoute()?.name;
        const initial = routeNameRef.current;
        if (initial) void trackScreenView(initial);
      }}
      onStateChange={() => {
        const previous = routeNameRef.current;
        const current = navigationRef.getCurrentRoute()?.name;
        if (current && previous !== current) {
          void trackScreenView(current);
        }
        routeNameRef.current = current;
      }}
    >
      {!isAuthenticated ? (
        <GuestStack />
      ) : !onboardingChecked ? (
        <View style={styles.gate}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <AuthenticatedStack showOnboarding={showOnboarding} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
