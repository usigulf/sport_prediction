import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import { theme } from '../constants/theme';

const SUPPORT_EMAIL = 'support@sportsprediction.com';
import { PRIVACY_POLICY_URL } from '../constants/legalUrls';

export const PrivacyPolicyScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: June 2026</Text>
      <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}>
        Full policy: {PRIVACY_POLICY_URL}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.body}>
          octobetiQ ("we", "our", or "the app") is an information-only sports prediction service.
          This policy describes what data we collect, how we use it, who we share it with, and your
          rights. We do not sell your personal information.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Data we collect</Text>
        <Text style={styles.body}>
          • Account: email address and a hashed password when you register.{'\n'}
          • Usage: games and predictions you view, favorites, leagues, and related activity.{'\n'}
          • Purchases: subscription tier via App Store in-app purchase (RevenueCat).
          {Platform.OS !== 'ios' ? ' Web checkout may use Stripe where available.' : ''}
          {'\n'}
          • Push: device push token when you enable notifications in Settings.{'\n'}
          • Ads (free tier): Google AdMob may show ads; on iOS, if you allow App Tracking
          Transparency, AdMob may use your advertising identifier (IDFA) for ad delivery and
          measurement.{'\n'}
          • Technical: server logs and errors to operate and improve the service.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. How we use your data</Text>
        <Text style={styles.body}>
          We use your data to provide and personalize the app; manage subscriptions and limits;
          send opted-in push notifications; show ads on the free tier; improve our product; and
          comply with law. We do not sell your personal data.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Third parties</Text>
        <Text style={styles.body}>
          We use Google (AdMob), Apple (in-app purchases), RevenueCat (subscriptions)
          {Platform.OS !== 'ios' ? ', Stripe (web billing)' : ''}, and licensed sports data
          providers. They process data under their own policies.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Tracking</Text>
        <Text style={styles.body}>
          On iOS you may be asked to allow tracking for more relevant ads (ATT). You can change this
          in Settings → Privacy & Security → Tracking. Premium may not show ads depending on plan.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Data retention & deletion</Text>
        <Text style={styles.body}>
          We keep account data while your account is active. Delete your account in Profile → Delete
          account, or email {SUPPORT_EMAIL}. We remove personal data within 30 days of a confirmed
          request.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Your rights (GDPR / CCPA)</Text>
        <Text style={styles.body}>
          You may have the right to access, correct, delete, or export your data, and to object or
          restrict processing. Contact {SUPPORT_EMAIL} to exercise these rights.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Security & contact</Text>
        <Text style={styles.body}>
          We use encryption in transit and hashed passwords. Questions: {SUPPORT_EMAIL}.
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
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  link: {
    fontSize: 12,
    color: theme.colors.accent,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
