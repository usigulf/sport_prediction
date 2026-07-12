import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GUEST_TEASER_PICK_LIMIT } from '../../constants/guestBrowse';
import { PREMIUM_PAYWALL_CONTEXT } from '../../constants/premiumCopy';
import { HOME_HERO_EMPTY_TAGLINE } from '../../constants/leagues';
import { theme } from '../../constants/theme';
import { getGreeting } from './homeScreenUtils';
import { homeScreenStyles as styles } from './homeScreenStyles';
import type { HomeScreenNavigationProp } from './homeScreenUtils';
import { trackScorecardOpened } from '../../services/productAnalytics';

type Props = {
  navigation: HomeScreenNavigationProp;
  isAuthenticated: boolean;
  userEmail?: string;
  forYouCount: number;
  accuracyPct: number | null;
};

export function HomeHeroStrip({
  navigation,
  isAuthenticated,
  userEmail,
  forYouCount,
  accuracyPct,
}: Props) {
  return (
    <View style={styles.heroStrip}>
      <Text style={styles.heroGreeting}>
        {isAuthenticated
          ? `${getGreeting()}${userEmail ? ` · ${userEmail.split('@')[0]}` : ''}`
          : 'Welcome to octobetiQ'}
      </Text>
      <Text style={styles.heroHeadline}>AI picks with tracked accuracy</Text>
      <Text style={styles.heroSub}>
        {forYouCount > 0
          ? `${forYouCount} pick${forYouCount === 1 ? '' : 's'} for you today`
          : HOME_HERO_EMPTY_TAGLINE}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.trustRow}
        contentContainerStyle={styles.trustRowContent}
      >
        <TouchableOpacity
          onPress={() => {
            void trackScorecardOpened('home');
            navigation.navigate('Accuracy');
          }}
          style={styles.trustPill}
        >
          <Text style={styles.trustPillText}>
            {accuracyPct != null ? `${accuracyPct}% · scorecard` : 'Scorecard'}
          </Text>
          <Ionicons name="chevron-forward" size={12} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Help')}
          style={styles.trustPill}
          activeOpacity={0.85}
        >
          <Text style={styles.trustPillText}>FAQ & trust</Text>
          <Ionicons name="chevron-forward" size={12} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function HomeGuestBanner({
  navigation,
  onSeeFreePick,
}: {
  navigation: HomeScreenNavigationProp;
  onSeeFreePick?: () => void;
}) {
  return (
    <View style={styles.guestBanner} testID="home-guest-banner">
      <Text style={styles.guestBannerText}>
        Guest mode — {GUEST_TEASER_PICK_LIMIT} free picks with probabilities today. Open one to see
        a real prediction, then create an account for full analysis.
      </Text>
      {onSeeFreePick ? (
        <TouchableOpacity
          onPress={onSeeFreePick}
          style={styles.guestBannerBtn}
          testID="guest-see-free-pick"
          accessibilityRole="button"
          accessibilityLabel="See today's free pick"
        >
          <Text style={styles.guestBannerBtnText}>See today's free pick</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('Paywall', {
            emphasizeTier: 'premium',
            contextMessage: PREMIUM_PAYWALL_CONTEXT,
          })
        }
        style={styles.guestPremiumLink}
      >
        <Text style={styles.guestPremiumLinkText}>View Premium plans</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={onSeeFreePick ? styles.guestPremiumLink : styles.guestBannerBtn}
      >
        <Text
          style={onSeeFreePick ? styles.guestPremiumLinkText : styles.guestBannerBtnText}
        >
          Create free account
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function ActivationScorecardNudge({
  onOpen,
  onDismiss,
}: {
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.guestBanner} testID="activation-scorecard-nudge">
      <Text style={styles.guestBannerText}>
        Next: open the Scorecard to see how we track pre-kickoff picks against final results.
      </Text>
      <TouchableOpacity
        onPress={onOpen}
        style={styles.guestBannerBtn}
        testID="activation-open-scorecard"
      >
        <Text style={styles.guestBannerBtnText}>Open Scorecard</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} style={styles.guestPremiumLink}>
        <Text style={styles.guestPremiumLinkText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

export function HomeStatsWidget({
  navigation,
  accuracyPct,
  favoritesCount,
}: {
  navigation: HomeScreenNavigationProp;
  accuracyPct: number | null;
  favoritesCount: { leagues: number; teams: number } | null;
}) {
  return (
    <View style={styles.statsWidget}>
      <TouchableOpacity
        style={styles.statsPill}
        onPress={() => {
          void trackScorecardOpened('home');
          navigation.navigate('Accuracy');
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="stats-chart" size={16} color={theme.colors.accent} />
        <Text style={styles.statsPillText}>
          {accuracyPct != null ? `Scorecard: ${accuracyPct}%` : 'Scorecard'}
        </Text>
      </TouchableOpacity>
      {favoritesCount && (favoritesCount.leagues > 0 || favoritesCount.teams > 0) ? (
        <TouchableOpacity
          style={styles.statsPill}
          onPress={() => navigation.navigate('Favorites')}
          activeOpacity={0.8}
        >
          <Ionicons name="star" size={16} color={theme.colors.accent} />
          <Text style={styles.statsPillText}>
            {favoritesCount.leagues > 0 && favoritesCount.teams > 0
              ? `${favoritesCount.leagues} leagues · ${favoritesCount.teams} teams`
              : favoritesCount.leagues > 0
                ? `${favoritesCount.leagues} leagues`
                : `${favoritesCount.teams} teams`}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
