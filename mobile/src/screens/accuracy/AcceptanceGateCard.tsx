import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ModelAcceptanceResponse } from '../../services/api';
import { theme } from '../../constants/theme';
import { humanizeCheckName } from './accuracyFormatters';

type Props = {
  acceptance: ModelAcceptanceResponse | null;
  failed: boolean;
};

export function AcceptanceGateCard({ acceptance, failed }: Props) {
  if (failed) {
    return (
      <View style={styles.card} accessibilityLabel="Model acceptance unavailable">
        <Text style={styles.title}>Model acceptance</Text>
        <Text style={styles.hint}>Could not load acceptance gates. Pull to refresh.</Text>
      </View>
    );
  }
  if (!acceptance) return null;

  const passed = acceptance.passed;
  const checks = acceptance.checks ?? [];
  const shown = checks.slice(0, 8);

  return (
    <View
      style={[styles.card, passed ? styles.cardPass : styles.cardFail]}
      accessibilityLabel={`Model acceptance ${acceptance.level}: ${passed ? 'passed' : 'not passed'}`}
    >
      <Text style={styles.eyebrow}>Acceptance protocol · {acceptance.wedge}</Text>
      <Text style={styles.title}>
        {passed ? 'Invite-beta gates passed' : 'Invite-beta gates not met'}
      </Text>
      <Text style={styles.hint}>
        Level {acceptance.level} · protocol {acceptance.protocol_version}. Performance marketing
        stays off until public_charge gates pass.
      </Text>
      {shown.map((c) => (
        <View key={c.name} style={styles.checkRow}>
          <Text style={[styles.checkMark, c.ok ? styles.ok : styles.bad]}>
            {c.ok ? '✓' : '✕'}
          </Text>
          <View style={styles.checkText}>
            <Text style={styles.checkName}>{humanizeCheckName(c.name)}</Text>
            <Text style={styles.checkDetail} numberOfLines={2}>
              {c.detail}
            </Text>
          </View>
        </View>
      ))}
      {checks.length > shown.length ? (
        <Text style={styles.more}>+{checks.length - shown.length} more checks via API</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.borderSubtle,
  },
  cardPass: {
    borderLeftColor: theme.colors.accent,
  },
  cardFail: {
    borderLeftColor: theme.colors.secondary,
  },
  eyebrow: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: theme.spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '700',
    width: 20,
    marginTop: 1,
  },
  ok: { color: theme.colors.accent },
  bad: { color: theme.colors.secondary },
  checkText: { flex: 1 },
  checkName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  checkDetail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  more: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
