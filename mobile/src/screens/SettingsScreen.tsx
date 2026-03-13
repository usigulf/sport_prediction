import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import {
  getPushNotificationsEnabled,
  setPushNotificationsEnabled,
} from '../utils/settingsStorage';
import {
  registerPushTokenIfPossible,
  disablePushNotifications,
} from '../utils/pushNotifications';
import { theme } from '../constants/theme';

export const SettingsScreen: React.FC = () => {
  const [pushEnabled, setPushEnabledState] = useState<boolean>(true);
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
      await registerPushTokenIfPossible();
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
          Game reminders and high-confidence pick alerts. Turn off to stop all push notifications.
        </Text>
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
});
