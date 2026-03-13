/**
 * Main Navigation Setup for Sports Prediction App
 */
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../store/hooks';
import { theme } from '../constants/theme';
import { getOnboardingComplete } from '../utils/onboardingStorage';

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
import { LiveHubScreen } from '../screens/LiveHubScreen';
import { LeaderboardsScreen } from '../screens/LeaderboardsScreen';
import { ChallengesScreen } from '../screens/ChallengesScreen';
import { CreateChallengeScreen } from '../screens/CreateChallengeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

// Types
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  GameDetail: { gameId: string };
  PredictionHistory: undefined;
  Paywall: undefined;
  Accuracy: undefined;
  Leaderboards: undefined;
  Challenges: undefined;
  CreateChallenge: undefined;
  Settings: undefined;
  Help: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Landing: undefined;
  Login: undefined;
  Register: undefined;
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

          return <Ionicons name={iconName} size={size} color={color} />;
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
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="LiveHub"
        component={LiveHubScreen}
        options={{ title: 'Trending' }}
      />
      <Tab.Screen
        name="Games"
        component={GamesScreen}
        options={{ title: 'Games' }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
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
        options={{ headerShown: false }}
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
    getOnboardingComplete().then((done) => {
      if (!cancelled) {
        setShowOnboarding(!done);
        setOnboardingChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <Stack.Navigator
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
            name="Landing"
            component={LandingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Create Account' }}
          />
        </Stack.Navigator>
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
