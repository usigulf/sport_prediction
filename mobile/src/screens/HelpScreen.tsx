import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { theme } from '../constants/theme';

const SUPPORT_EMAIL = 'support@sportsprediction.com';

const FAQ = [
  {
    q: 'How do predictions work?',
    a: 'We use machine learning models trained on historical game data to estimate win probabilities. Each game gets a home win probability, away win probability, and a confidence level (low, medium, high).',
  },
  {
    q: 'What is the daily prediction limit?',
    a: 'Free accounts can view a limited number of predictions per day. Upgrade to Premium in Profile → Subscription for unlimited predictions and full explanations.',
  },
  {
    q: 'What do the stars (pick strength) mean?',
    a: 'Each pick has a 1–5 star strength based on our model’s confidence: 5 stars = high confidence, 3 = medium, 1 = low. We recommend focusing on 3-star picks and above for the best value.',
  },
  {
    q: 'What are high-confidence picks?',
    a: 'When our model is very confident (e.g. strong home or away advantage), we mark the prediction as high confidence. You can get push notifications for these via Settings → Push notifications.',
  },
  {
    q: 'How is "Model accuracy" calculated?',
    a: 'We compare our predicted winner (home or away) to the actual result for finished games. The percentage shows how often we got the winner right. View it in Profile → Model accuracy.',
  },
  {
    q: 'How do I add favorite teams?',
    a: 'Open a game from Home or Games, then tap the star next to a team name to add that team to Favorites. Your Favorites tab will show games for those teams.',
  },
];

export const HelpScreen: React.FC = () => {
  const openContact = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Sports%20Prediction%20App%20Support`).catch(() => {});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Help & FAQ</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently asked questions</Text>
        {FAQ.map((item, i) => (
          <View key={i} style={styles.faqItem}>
            <Text style={styles.question}>{item.q}</Text>
            <Text style={styles.answer}>{item.a}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact us</Text>
        <Text style={styles.contactText}>
          Need more help? Send us an email and we'll get back to you.
        </Text>
        <TouchableOpacity style={styles.contactButton} onPress={openContact}>
          <Text style={styles.contactButtonText}>{SUPPORT_EMAIL}</Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  faqItem: {
    backgroundColor: theme.colors.backgroundCard,
    padding: 16,
    borderRadius: theme.radii.sm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  contactText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  contactButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
  },
  contactButtonText: {
    fontSize: 15,
    color: theme.colors.background,
    fontWeight: '500',
  },
});
