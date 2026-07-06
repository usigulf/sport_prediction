import React from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { theme } from '../constants/theme';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../constants/legalUrls';
import { openIosManageSubscriptions } from '../utils/manageSubscriptions';

export type SubscriptionLegalPlan = {
  title: string;
  lengthLabel: string;
  priceLabel: string;
  trialNote?: string;
};

type Props = {
  plans: SubscriptionLegalPlan[];
};

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

/**
 * Apple 3.1.2(c): title, length, price, and functional Privacy + Terms links on the purchase flow.
 */
export function SubscriptionLegalFooter({ plans }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Auto-renewable subscriptions</Text>
      {plans.map((plan) => (
        <Text key={plan.title} style={styles.planLine}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          {' — '}
          {plan.lengthLabel}
          {' — '}
          {plan.priceLabel}
          {plan.trialNote ? ` (${plan.trialNote})` : ''}
        </Text>
      ))}
      <Text style={styles.body}>
        Payment is charged to your Apple ID account at confirmation of purchase. Subscriptions
        automatically renew unless cancelled at least 24 hours before the end of the current period.
        {Platform.OS === 'ios' ? (
          <>
            {' '}
            <Text style={styles.link} onPress={() => void openIosManageSubscriptions()}>
              Manage subscriptions
            </Text>
            {' in the App Store.'}
          </>
        ) : (
          ' Manage or cancel in your app store account settings.'
        )}
      </Text>
      <Text style={styles.body}>
        <Text style={styles.link} onPress={() => openUrl(PRIVACY_POLICY_URL)}>
          Privacy Policy
        </Text>
        {' · '}
        <Text style={styles.link} onPress={() => openUrl(TERMS_OF_USE_URL)}>
          Terms of Use (EULA)
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  planLine: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  planTitle: {
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  body: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: theme.spacing.sm,
  },
  link: {
    color: theme.colors.accent,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
