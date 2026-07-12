/**
 * First-run privacy choices after age gate (audit #7).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { completePrivacyConsent } from '../utils/privacyPreferences';

type Props = {
  onCompleted: () => void;
};

export const PrivacyConsentScreen: React.FC<Props> = ({ onCompleted }) => {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [adsMeasurementEnabled, setAdsMeasurementEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await completePrivacyConsent({ analyticsEnabled, adsMeasurementEnabled });
      onCompleted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Privacy choices">
      <View style={styles.card}>
        <Text style={styles.title}>Your privacy choices</Text>
        <Text style={styles.body}>
          We do not sell personal information. Choose what we may collect before analytics or ads
          start. You can change this anytime in Settings.
        </Text>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Product analytics</Text>
            <Text style={styles.hint}>Anonymous usage events (e.g. screens opened) to improve the app.</Text>
          </View>
          <Switch
            value={analyticsEnabled}
            onValueChange={setAnalyticsEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentDim }}
            thumbColor={Platform.OS === 'android' ? theme.colors.accent : undefined}
            accessibilityLabel="Allow product analytics"
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Ad measurement</Text>
            <Text style={styles.hint}>
              Allows ad performance signals. Free-tier ads may still show without this; we will not
              send ad telemetry until you enable it.
            </Text>
          </View>
          <Switch
            value={adsMeasurementEnabled}
            onValueChange={setAdsMeasurementEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentDim }}
            thumbColor={Platform.OS === 'android' ? theme.colors.accent : undefined}
            accessibilityLabel="Allow ad measurement"
          />
        </View>

        <TouchableOpacity
          style={[styles.primary, saving && styles.primaryDisabled]}
          onPress={() => void finish()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save privacy choices and continue"
        >
          <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => Linking.openURL('https://octobetiq.com/privacy')}
          accessibilityRole="link"
        >
          <Text style={styles.secondaryText}>Privacy policy</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundElevated,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  rowText: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  primary: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: theme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    color: theme.colors.accent,
    fontSize: 14,
  },
});
