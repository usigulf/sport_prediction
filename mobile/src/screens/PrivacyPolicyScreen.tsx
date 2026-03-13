import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../constants/theme';

export const PrivacyPolicyScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: February 2025</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.body}>
          Octobet ("we", "our", or "the app") is an information-only sports prediction service.
          This policy describes what data we collect, how we use it, and your rights. We do not sell
          your personal data.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Data we collect</Text>
        <Text style={styles.body}>
          • Account: email address and a hashed password when you register.{'\n'}
          • Usage: which games and predictions you view (prediction history), and your favorite
          teams and leagues, to personalize your experience and show accuracy stats.{'\n'}
          • Notifications: if you enable push notifications, we store your device push token to
          send you game reminders and high-confidence pick alerts.{'\n'}
          • Technical: we may log general usage (e.g. errors) to improve the service. We do not
          track you across other apps or sites.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. How we use your data</Text>
        <Text style={styles.body}>
          We use your data to: provide and personalize the app; send you push notifications you
          have opted into; enforce subscription and usage limits; improve our models and product;
          and comply with law. We do not use your data for advertising or sell it to third parties.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Data retention</Text>
        <Text style={styles.body}>
          We keep your account and associated data until you delete your account. You can request
          account deletion by contacting us; we will remove your data within 30 days.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Your rights (GDPR / CCPA)</Text>
        <Text style={styles.body}>
          You have the right to: access the personal data we hold about you; correct it; request
          deletion; and (where applicable) data portability. If you are in the EU/EEA or California,
          you may also have the right to object or restrict processing and to lodge a complaint
          with a supervisory authority. To exercise these rights or delete your account, contact us
          at support@sportsprediction.com.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Security</Text>
        <Text style={styles.body}>
          We use industry-standard measures (e.g. encryption, secure storage) to protect your
          data. Passwords are hashed; we do not store plain-text passwords.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Contact</Text>
        <Text style={styles.body}>
          Questions about this policy or your data: support@sportsprediction.com.
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
