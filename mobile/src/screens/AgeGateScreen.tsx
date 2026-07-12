/**
 * Age confirmation before using octobetiQ (I84).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { setAgeGateConfirmed } from '../utils/ageGateStorage';

type Props = {
  onConfirmed: () => void;
};

export const AgeGateScreen: React.FC<Props> = ({ onConfirmed }) => {
  const handleConfirm = async () => {
    await setAgeGateConfirmed();
    onConfirmed();
  };

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Age confirmation" testID="age-gate-screen">
      <View style={styles.card}>
        <Text style={styles.title}>Age confirmation</Text>
        <Text style={styles.body}>
          octobetiQ provides informational sports analysis and win-probability estimates. It is not
          a sportsbook and does not accept wagers. You must be at least 17 years old to continue.
        </Text>
        <TouchableOpacity
          style={styles.primary}
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel="I am 17 or older, continue"
          testID="age-gate-continue"
        >
          <Text style={styles.primaryText}>I am 17 or older</Text>
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
  primary: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
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
