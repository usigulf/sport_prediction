/**
 * Landing screen: Hero + Today's Picks Teaser + Core Features + Pricing + Sticky CTA.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';
import { AuthTrustLinks } from '../components/AuthTrustLinks';
import {
  LANDING_FEATURE_PREDICTIONS_DESC,
  LANDING_HERO_SUBHEADLINE,
  PRICING_FREE_LEAGUES_LINE,
} from '../constants/leagues';
import { apiService } from '../services/api';
import { soccerBetaFetchParams } from '../utils/soccerBetaFetch';
import { formatLeagueLabel } from '../utils/leagueDisplay';
import { PREMIUM_MONTHLY_PRICE_LABEL } from '../constants/subscriptionPricing';
import { PREMIUM_LANDING_FEATURES_LINE } from '../constants/premiumCopy';
import { PremiumPreviewModal } from '../components/PremiumPreviewModal';

type LandingScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = 280;
const PICK_CARD_WIDTH = 300;

const FALLBACK_BG = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80';

type TeaserPick = {
  id: string;
  match: string;
  confidence: number;
  reason: string;
};

function mapFeedPickToTeaser(pick: {
  id: string;
  league: string;
  home_team?: { name?: string } | null;
  away_team?: { name?: string } | null;
  prediction?: {
    home_win_probability: number;
    away_win_probability: number;
    confidence_level?: string;
  } | null;
}, _index: number): TeaserPick | null {
  const pred = pick.prediction;
  if (!pred) return null;
  const home = pick.home_team?.name?.trim() || 'Home';
  const away = pick.away_team?.name?.trim() || 'Away';
  const confidence = Math.round(
    Math.max(pred.home_win_probability, pred.away_win_probability) * 100,
  );
  if (!Number.isFinite(confidence) || confidence <= 0) return null;
  return {
    id: pick.id,
    match: `${home} vs ${away}`,
    confidence,
    reason: `${formatLeagueLabel(pick.league)} · ${pred.confidence_level ?? 'model'} confidence`,
  };
}

const FEATURES = [
  {
    icon: 'analytics-outline' as const,
    title: 'AI predictions',
    desc: LANDING_FEATURE_PREDICTIONS_DESC,
  },
  {
    icon: 'person-outline' as const,
    title: 'Deep context',
    desc: 'Standings, form, and freshness notes where data is licensed and synced.',
  },
  {
    icon: 'ribbon-outline' as const,
    title: 'Challenges',
    desc: 'Pick games and compare your results to the model.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Alerts',
    desc: 'Optional pushes for high-confidence plays.',
  },
];

export const LandingScreen: React.FC = () => {
  const navigation = useNavigation<LandingScreenNavigationProp>();
  const [teaserPicks, setTeaserPicks] = useState<TeaserPick[]>([]);
  const [teaserLoading, setTeaserLoading] = useState(true);
  const [showPremiumPreview, setShowPremiumPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTeaserLoading(true);
      try {
        const res = await apiService.getTopPicks({ limit: 4, ...soccerBetaFetchParams() });
        const mapped = (res.picks ?? [])
          .map((p, i) => mapFeedPickToTeaser(p, i))
          .filter((p): p is TeaserPick => p != null)
          .slice(0, 4);
        if (!cancelled) setTeaserPicks(mapped);
      } catch {
        if (!cancelled) setTeaserPicks([]);
      } finally {
        if (!cancelled) setTeaserLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGetFreePicks = () => navigation.navigate('Register');
  const handleLogIn = () => navigation.navigate('Login');
  const handleUnlockMore = () => navigation.navigate('Register');
  const handleStartTrial = () => setShowPremiumPreview(true);
  const handleGetStarted = () => navigation.navigate('Register');
  const handleSeePremium = () => setShowPremiumPreview(true);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero – full viewport height on load */}
        <ImageBackground source={{ uri: FALLBACK_BG }} style={styles.heroWrap} resizeMode="cover">
          <View style={styles.overlay} />
          <SafeAreaView style={styles.heroSafe} edges={['top', 'left', 'right']}>
            <TouchableOpacity style={styles.loginLink} onPress={handleLogIn} accessibilityLabel="Log in">
              <Text style={styles.loginLinkText}>Log in</Text>
            </TouchableOpacity>
            <View style={styles.copyBlock}>
              <Text style={styles.headline}>Smarter Sports Predictions</Text>
              <Text style={styles.subheadline}>{LANDING_HERO_SUBHEADLINE}</Text>
            </View>
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleGetFreePicks} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Get Free Daily Picks</Text>
              </TouchableOpacity>
              {Platform.OS === 'android' ? (
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={() =>
                    Linking.openURL(
                      'https://play.google.com/store/apps/details?id=com.sportsprediction.app',
                    ).catch(() => {})
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.outlineButtonText}>Get it on Google Play</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.proofLine}>Informational picks · Methodology & accuracy tracked in the app</Text>
            <AuthTrustLinks style={{ marginTop: theme.spacing.md }} />
          </SafeAreaView>
        </ImageBackground>

        {/* Today's Picks Teaser */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>High-Confidence Picks Today</Text>
          <Text style={styles.sectionDisclaimer}>
            {teaserPicks.length > 0
              ? "Live model picks for today's games — informational only"
              : 'Fresh picks appear when games are scheduled and modeled'}
          </Text>
          {teaserLoading ? (
            <View style={styles.teaserSkeletonRow}>
              {[1, 2].map((i) => (
                <View key={i} style={styles.teaserSkeletonCard}>
                  <View style={styles.teaserSkeletonLine} />
                  <View style={[styles.teaserSkeletonLine, styles.teaserSkeletonLineShort]} />
                </View>
              ))}
            </View>
          ) : teaserPicks.length === 0 ? (
            <View style={styles.teaserEmpty}>
              <Ionicons name="calendar-outline" size={28} color={theme.colors.textMuted} />
              <Text style={styles.teaserEmptyTitle}>No picks on the board right now</Text>
              <Text style={styles.teaserEmptySub}>
                Sign up free to get alerts when high-confidence plays are ready.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.picksScroll}
              snapToInterval={PICK_CARD_WIDTH + theme.spacing.md}
              snapToAlignment="start"
              decelerationRate="fast"
            >
              {teaserPicks.map((pick) => (
                <View key={pick.id} style={styles.pickCard}>
                  <Text style={styles.pickMatch} numberOfLines={2}>{pick.match}</Text>
                  <View style={styles.confidenceRow}>
                    <View style={styles.confidenceBarBg}>
                      <View style={[styles.confidenceBarFill, { width: `${pick.confidence}%` }]} />
                    </View>
                    <Text style={styles.confidencePct}>{pick.confidence}%</Text>
                  </View>
                  <Text style={styles.pickReason} numberOfLines={1}>{pick.reason}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.unlockButton} onPress={handleUnlockMore}>
            <Text style={styles.unlockButtonText}>Unlock More → Sign Up Free</Text>
          </TouchableOpacity>
        </View>

        {/* Core Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why octobetiQ</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <Ionicons name={f.icon} size={28} color={theme.colors.accent} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Simple pricing</Text>
          <View style={styles.pricingRow}>
            <View style={styles.pricingCard}>
              <Text style={styles.pricingName}>Free</Text>
              <Text style={styles.pricingDesc}>{PRICING_FREE_LEAGUES_LINE}</Text>
            </View>
            <View style={[styles.pricingCard, styles.pricingCardHighlight]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See Premium features"
                onPress={handleSeePremium}
                style={({ pressed }) => pressed && styles.pressedLink}
              >
                <Text style={styles.pricingName}>Premium</Text>
                <Text style={styles.pricingPrice}>{PREMIUM_MONTHLY_PRICE_LABEL}/mo</Text>
                <Text style={styles.pricingDesc}>
                  {PREMIUM_LANDING_FEATURES_LINE}
                </Text>
                <Text style={styles.pricingTrial}>7-Day Free Trial • Cancel anytime</Text>
                <Text style={styles.seePremiumLink}>See Premium features →</Text>
              </Pressable>
            </View>
          </View>
          <TouchableOpacity style={styles.trialButton} onPress={handleStartTrial}>
            <Text style={styles.trialButtonText}>See Premium & Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.seePremiumTextButton} onPress={handleSeePremium}>
            <Text style={styles.seePremiumTextOnly}>Compare Free vs Premium</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <SafeAreaView style={styles.stickyCtaWrap} edges={['bottom']}>
        <TouchableOpacity style={styles.stickyCta} onPress={handleGetStarted} activeOpacity={0.9}>
          <Text style={styles.stickyCtaText}>Get Started Free</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <PremiumPreviewModal
        visible={showPremiumPreview}
        onClose={() => setShowPremiumPreview(false)}
        onRegister={() => navigation.navigate('Register')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroWrap: {
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 20, 40, 0.88)',
  },
  heroSafe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  loginLink: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  loginLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  copyBlock: {
    marginBottom: theme.spacing.xl + 8,
  },
  headline: {
    fontSize: 52,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 56,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.md,
  },
  subheadline: {
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.textSecondary,
  },
  buttons: {
    gap: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    minHeight: theme.minTouchSize,
    borderRadius: theme.radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.background,
  },
  outlineButton: {
    minHeight: theme.minTouchSize,
    borderRadius: theme.radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  proofLine: {
    marginTop: theme.spacing.xl,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionDisclaimer: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  teaserSkeletonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  teaserSkeletonCard: {
    width: PICK_CARD_WIDTH,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  teaserSkeletonLine: {
    height: 14,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  teaserSkeletonLineShort: {
    width: '60%',
  },
  teaserEmpty: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  teaserEmptyTitle: {
    marginTop: theme.spacing.sm,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  teaserEmptySub: {
    marginTop: theme.spacing.xs,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  picksScroll: {
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  pickCard: {
    width: PICK_CARD_WIDTH,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginRight: theme.spacing.md,
  },
  pickMatch: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  confidenceBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.xs,
  },
  confidencePct: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
    minWidth: 36,
    textAlign: 'right',
  },
  pickReason: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  unlockButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  featureText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  pricingCardHighlight: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentDim,
  },
  pricingName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  pricingPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  pricingDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  pricingTrial: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  seePremiumLink: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seePremiumTextButton: {
    marginTop: theme.spacing.sm,
    alignSelf: 'center',
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  seePremiumTextOnly: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  pressedLink: {
    opacity: 0.9,
  },
  pricingCardPro: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  proAvailableRow: {
    marginBottom: theme.spacing.sm,
  },
  proAvailablePill: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
    backgroundColor: theme.colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  proCtaOutline: {
    marginTop: theme.spacing.md,
    minHeight: 44,
    borderRadius: theme.radii.lg,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  proCtaOutlineText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  trialButton: {
    backgroundColor: theme.colors.accent,
    minHeight: theme.minTouchSize,
    borderRadius: theme.radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  trialButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.background,
  },
  bottomSpacer: {
    height: 24,
  },
  stickyCtaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  stickyCta: {
    backgroundColor: theme.colors.accent,
    minHeight: theme.minTouchSize,
    borderRadius: theme.radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyCtaText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.background,
  },
});
