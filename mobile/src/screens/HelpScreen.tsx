import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';
import { AVAILABLE_LEAGUES_COUNT, PRODUCT_SCOPE_LONG_DESCRIPTION } from '../constants/leagues';

const SUPPORT_EMAIL = 'support@sportsprediction.com';

const FAQ = [
  {
    q: 'Which sports does octobetiQ cover?',
    a: `We cover ${AVAILABLE_LEAGUES_COUNT} major professional competitions — pro football, pro basketball, and international soccer. Labels in the league picker match Favorites. Coverage depth varies by competition depending on licensed data and sync jobs.`,
  },
  {
    q: 'How do predictions work?',
    a: 'We use machine learning models trained on historical game data to estimate win probabilities. Each game gets a home win probability, away win probability, and a confidence level (low, medium, high). Soccer uses three-way (1X2) style probabilities where applicable.',
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
    a:
      'For finished games we compare the latest stored prediction to the final score. Soccer uses three-way outcomes (home / draw / away), including implied draw probability; other sports use the predicted favorite vs the winner (ties do not match either side). Numbers are informational, not betting advice. Open Model accuracy (from the welcome page, Home, Profile, or Settings) for methodology, a 30-day rollup, confidence buckets, and data coverage.',
  },
  {
    q: 'How do I add favorite teams?',
    a: 'Open a game from Home or Games, then tap the star next to a team name to add that team to Favorites. Your Favorites tab will show games for those teams.',
  },
];

export const HelpScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const openContact = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=octobetiQ%20support`).catch(() => {});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Help & FAQ</Text>

      <View style={styles.trustCard}>
        <Text style={styles.trustTitle}>Trust & transparency</Text>
        <Text style={styles.trustBody}>
          {PRODUCT_SCOPE_LONG_DESCRIPTION}. See how we score picks against final results, rolling accuracy (
          {AVAILABLE_LEAGUES_COUNT} competitions), and which competitions have standings data in the app right now.
        </Text>
        <TouchableOpacity
          style={styles.trustButton}
          onPress={() => navigation.navigate('Accuracy')}
          activeOpacity={0.85}
        >
          <Text style={styles.trustButtonText}>Model accuracy & methodology</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.background} />
        </TouchableOpacity>
      </View>

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
  trustCard: {
    backgroundColor: theme.colors.backgroundCard,
    padding: 16,
    borderRadius: theme.radii.sm,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  trustTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  trustBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: 14,
  },
  trustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
  },
  trustButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.background,
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
