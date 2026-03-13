import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../constants/theme';

export const TermsOfServiceScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.updated}>Last updated: February 2025</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Acceptance</Text>
        <Text style={styles.body}>
          By using Octobet ("the app"), you agree to these Terms of Service and our Privacy Policy.
          If you do not agree, do not use the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Service description</Text>
        <Text style={styles.body}>
          Octobet provides information-only sports predictions and analytics. We do not offer
          gambling, betting, or financial advice. Predictions are for entertainment and informational
          purposes only. We do not guarantee accuracy of any prediction.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Eligibility</Text>
        <Text style={styles.body}>
          You must be at least 13 years old to use the app. By using the app you represent that you
          meet this requirement and that you will not use the service for any illegal purpose or in
          violation of any applicable laws.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Account and conduct</Text>
        <Text style={styles.body}>
          You are responsible for keeping your account credentials secure. You may not share your
          account, misuse the service, attempt to gain unauthorized access, or use the app to
          harass others. We may suspend or terminate accounts that violate these terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Subscriptions and payments</Text>
        <Text style={styles.body}>
          Paid tiers (Premium, Pro) are subject to the pricing and terms shown in the app at the
          time of purchase. Refunds are handled according to the platform (App Store / Google Play)
          or our stated policy. We may change pricing with notice; continued use after changes
          constitutes acceptance.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Intellectual property</Text>
        <Text style={styles.body}>
          The app, its content, branding, and technology are owned by us or our licensors. You may
          not copy, modify, or reverse-engineer the service except as permitted by law.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Disclaimers</Text>
        <Text style={styles.body}>
          The service is provided "as is." We disclaim warranties of accuracy, fitness for a
          particular purpose, and non-infringement. We are not liable for any decisions you make
          based on predictions or for any loss arising from use of the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Limitation of liability</Text>
        <Text style={styles.body}>
          To the maximum extent permitted by law, we are not liable for indirect, incidental,
          special, or consequential damages, or for any loss of data or profits, arising from your
          use of the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. Changes and contact</Text>
        <Text style={styles.body}>
          We may update these terms from time to time; we will indicate the last updated date. Your
          continued use after changes means you accept the new terms. Questions: support@sportsprediction.com.
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
