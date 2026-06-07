import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiService } from '../services/api';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchUserProfile } from '../store/slices/authSlice';
import { signOut } from '../utils/signOut';
import { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';
import { OctobetiQWordmark } from '../components/OctobetiQWordmark';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  StackNavigationProp<RootStackParamList>
>;

function subscriptionTierLabel(tier: string | undefined): string {
  switch (tier) {
    case 'premium_plus':
    case 'pro':
      return 'Pro';
    case 'premium':
      return 'Premium';
    default:
      return 'Free';
  }
}

function subscriptionMenuSubtext(tier: string | undefined): string {
  if (!tier || tier === 'free') return 'Upgrade to Premium';
  if (tier === 'premium') return 'Upgrade to Pro';
  return 'Manage';
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const loadUserInfo = async () => {
    setLoadError(null);
    try {
      await dispatch(fetchUserProfile()).unwrap();
    } catch (error) {
      setLoadError(getUserFriendlyMessage(error));
    }
  };

  useEffect(() => {
    loadUserInfo();
  }, []);

  const tier = user?.subscriptionTier ?? 'free';

  const handleLogoutPress = () => {
    if (loggingOut) return;
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    void signOut(dispatch).finally(() => {
      setLoggingOut(false);
      setShowLogoutModal(false);
    });
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
              await signOut(dispatch);
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
      case 'pro':
        return theme.colors.secondary;
      case 'premium':
        return theme.colors.accent;
      default:
        return theme.colors.textMuted;
    }
  };

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserInfo}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.header}>
        <OctobetiQWordmark variant="small" style={styles.brandWordmark} />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
        <View
          style={[
            styles.tierBadge,
            { backgroundColor: getTierColor(tier) },
          ]}
        >
          <Text style={styles.tierText}>
            {subscriptionTierLabel(tier).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            const t = tier;
            if (t === 'free') {
              navigation.navigate('Paywall', { emphasizeTier: 'premium' });
            } else if (t === 'premium') {
              navigation.navigate('Paywall', { emphasizeTier: 'premium_plus' });
            } else {
              navigation.navigate('Paywall');
            }
          }}
        >
          <Text style={styles.menuText}>Subscription</Text>
          <Text style={styles.menuSubtext}>
            {subscriptionMenuSubtext(tier)}
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
          onPress={() => Linking.openURL('mailto:support@sportsprediction.com?subject=octobetiQ%20support').catch(() => {})}
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

      <TouchableOpacity
        style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
        onPress={handleLogoutPress}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color={theme.colors.text} />
        ) : (
          <Text style={styles.logoutText}>Logout</Text>
        )}
      </TouchableOpacity>
    </ScrollView>

    <Modal
      visible={showLogoutModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loggingOut) setShowLogoutModal(false);
      }}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => {
          if (!loggingOut) setShowLogoutModal(false);
        }}
      >
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Logout</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to logout?
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowLogoutModal(false)}
              disabled={loggingOut}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmButton, loggingOut && styles.logoutButtonDisabled]}
              onPress={confirmLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.modalConfirmText}>Logout</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl * 2,
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
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.secondary,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
