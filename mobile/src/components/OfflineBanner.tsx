import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Global banner when the device has no network. Cached games/picks may still be shown.
 */
export const OfflineBanner: React.FC = () => {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View
        style={styles.banner}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel="You are offline. Showing cached data where available."
      >
        <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.text} />
        <Text style={styles.text}>You&apos;re offline — showing cached data where available.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: theme.colors.secondaryDim,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryDim,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.secondary,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
