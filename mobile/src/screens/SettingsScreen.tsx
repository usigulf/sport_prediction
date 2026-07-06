import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  getPushNotificationsEnabled,
  setPushNotificationsEnabled,
} from '../utils/settingsStorage';
import {
  registerPushTokenIfPossible,
  disablePushNotifications,
} from '../utils/pushNotifications';
import { theme } from '../constants/theme';
import {
  isIosManageSubscriptionsAvailable,
  openIosManageSubscriptions,
} from '../utils/manageSubscriptions';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [pushEnabled, setPushEnabledState] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const enabled = await getPushNotificationsEnabled();
    setPushEnabledState(enabled);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onPushToggle = async (value: boolean) => {
    setPushEnabledState(value);
    await setPushNotificationsEnabled(value);
    if (value) {
      await registerPushTokenIfPossible({ requestPermission: true });
    } else {
      await disablePushNotifications();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Push notifications</Text>
          {!loading && (
            <Switch
              value={pushEnabled}
              onValueChange={onPushToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.accentDim }}
              thumbColor={Platform.OS === 'android' ? theme.colors.accent : undefined}
            />
          )}
        </View>
        <Text style={styles.hint}>
          Kickoff alerts about 2 hours before games for your favorite teams and leagues,
          post-game result summaries, and high-confidence pick alerts. Turn off to stop all push notifications.
        </Text>
      </View>

      {isIosManageSubscriptionsAvailable() ? (
        <>
          <Text style={styles.outerSectionTitle}>Subscription</Text>
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.linkRow, styles.linkRowLast]}
              onPress={() => void openIosManageSubscriptions()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Manage subscriptions in App Store"
            >
              <View style={styles.linkTextBlock}>
                <Text style={styles.linkTitle}>Manage subscriptions</Text>
                <Text style={styles.linkSubtitle}>
                  Cancel or change your Premium plan in the App Store
                </Text>
              </View>
              <Ionicons name="open-outline" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      <Text style={styles.outerSectionTitle}>Support & trust</Text>
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('Help')}
          activeOpacity={0.7}
        >
          <View style={styles.linkTextBlock}>
            <Text style={styles.linkTitle}>Help & FAQ</Text>
            <Text style={styles.linkSubtitle}>Transparency, methodology, how accuracy works</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkRow, styles.linkRowLast]}
          onPress={() => navigation.navigate('Accuracy')}
          activeOpacity={0.7}
        >
          <View style={styles.linkTextBlock}>
            <Text style={styles.linkTitle}>Model accuracy</Text>
            <Text style={styles.linkSubtitle}>Overall, last 30 days, confidence & data coverage</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  outerSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    minHeight: theme.minTouchSize,
  },
  linkRowLast: {
    borderBottomWidth: 0,
  },
  linkTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  linkSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
