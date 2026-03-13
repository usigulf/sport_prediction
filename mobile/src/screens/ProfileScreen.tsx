import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiService, setAuthToken } from '../services/api';
import { clearStoredAuth } from '../utils/authStorage';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';
import { OctobetWordmark } from '../components/OctobetWordmark';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUserInfo = async () => {
    setLoadError(null);
    try {
      const info = await apiService.getCurrentUser();
      setUserInfo(info);
    } catch (error) {
      setLoadError(getUserFriendlyMessage(error));
    }
  };

  useEffect(() => {
    loadUserInfo();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearStoredAuth();
          setAuthToken(null);
          dispatch(logout());
          // Navigator switches to unauthenticated stack (Landing) when isAuthenticated becomes false
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'Permanently delete your account and all your data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteAccount();
              await clearStoredAuth();
              setAuthToken(null);
              dispatch(logout());
              // Navigator switches to unauthenticated stack (Landing) when isAuthenticated becomes false
            } catch (e) {
              Alert.alert('Error', getUserFriendlyMessage(e));
            }
          },
        },
      ]
    );
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium_plus':
        return theme.colors.secondary;
      case 'premium':
        return theme.colors.accent;
      default:
        return theme.colors.textMuted;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserInfo}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.header}>
        <OctobetWordmark variant="small" style={styles.brandWordmark} />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userInfo?.email?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.email}>{userInfo?.email || user?.email}</Text>
        <View
          style={[
            styles.tierBadge,
            { backgroundColor: getTierColor(userInfo?.subscription_tier || 'free') },
          ]}
        >
          <Text style={styles.tierText}>
            {userInfo?.subscription_tier?.toUpperCase() || 'FREE'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Paywall')}
        >
          <Text style={styles.menuText}>Subscription</Text>
          <Text style={styles.menuSubtext}>
            {userInfo?.subscription_tier === 'free' ? 'Upgrade to Premium' : 'Manage'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PredictionHistory')}
        >
          <Text style={styles.menuText}>My Picks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Accuracy')}
        >
          <Text style={styles.menuText}>Model accuracy</Text>
          <Text style={styles.menuSubtext}>How we've done</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Leaderboards')}
        >
          <Text style={styles.menuText}>Leaderboard</Text>
          <Text style={styles.menuSubtext}>Rank by pick accuracy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Challenges')}
        >
          <Text style={styles.menuText}>Challenges</Text>
          <Text style={styles.menuSubtext}>Compete on picks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Help')}
        >
          <Text style={styles.menuText}>Help & FAQ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Linking.openURL('mailto:support@sportsprediction.com?subject=Sports%20Prediction%20App').catch(() => {})}
        >
          <Text style={styles.menuText}>Contact Us</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Text style={styles.menuText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('TermsOfService')}
        >
          <Text style={styles.menuText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger zone</Text>
        <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.backgroundElevated,
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  brandWordmark: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.background,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
  },
  tierText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: theme.colors.secondaryDim,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  errorBannerText: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radii.sm,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  section: {
    backgroundColor: theme.colors.backgroundElevated,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    minHeight: theme.minTouchSize,
  },
  menuText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  menuSubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  deleteAccountText: {
    fontSize: 16,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  logoutButton: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  logoutText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
