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

type LandingScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = 280;
const PICK_CARD_WIDTH = 300;

const FALLBACK_BG = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80';

const FALLBACK_TEASER_PICKS = [
  { match: 'Lakers vs Celtics', confidence: 68, reason: 'Matchup & pace inputs', locked: false },
  { match: 'Chiefs vs Bills', confidence: 72, reason: 'Strength vs strength', locked: true },
  { match: 'Man City vs Arsenal', confidence: 61, reason: 'Form & table context', locked: false },
  { match: 'Real Madrid vs Barcelona', confidence: 65, reason: 'Rivalry form snapshot', locked: true },
];

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
  const [teaserPicks, setTeaserPicks] = useState(FALLBACK_TEASER_PICKS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getTopPicks({ limit: 4, ...soccerBetaFetchParams() });
        const mapped = (res.picks ?? []).slice(0, 4).map((p, i) => ({
          match: `${p.home_team_name} vs ${p.away_team_name}`,
          confidence: Math.round(Math.max(p.home_win_probability, p.away_win_probability) * 100),
          reason: `${formatLeagueLabel(p.league)} · ${p.confidence_level} confidence`,
          locked: i % 2 === 1,
        }));
        if (!cancelled && mapped.length > 0) setTeaserPicks(mapped);
      } catch {
        // keep fallback picks
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGetFreePicks = () => navigation.navigate('Register');
  const handleDownloadApp = () => {
    if (Platform.OS === 'ios') Linking.openURL('https://apps.apple.com/app/octobet').catch(() => {});
    else Linking.openURL('https://play.google.com/store/apps/details?id=com.sportsprediction.app').catch(() => {});
  };
  const handleLogIn = () => navigation.navigate('Login');
  const handleUnlockMore = () => navigation.navigate('Register');
  const handleStartTrial = () => navigation.navigate('Register');
  const handleGetStarted = () => navigation.navigate('Register');

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
              <TouchableOpacity style={styles.outlineButton} onPress={handleDownloadApp} activeOpacity={0.85}>
                <Text style={styles.outlineButtonText}>Download App</Text>
                <View style={styles.badges}>
                  <View style={styles.badge}><Text style={styles.badgeText}>App Store</Text></View>
                  <View style={styles.badge}><Text style={styles.badgeText}>Google Play</Text></View>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.proofLine}>Informational picks · Methodology & accuracy tracked in the app</Text>
            <AuthTrustLinks style={{ marginTop: theme.spacing.md }} />
          </SafeAreaView>
        </ImageBackground>

        {/* Today's Picks Teaser */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>High-Confidence Picks Today</Text>
          <Text style={styles.sectionDisclaimer}>Illustrative examples — not live predictions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.picksScroll}
            snapToInterval={PICK_CARD_WIDTH + theme.spacing.md}
            snapToAlignment="start"
            decelerationRate="fast"
          >
            {teaserPicks.map((pick, i) => (
              <View key={i} style={styles.pickCard}>
                {pick.locked && <View style={styles.pickCardLock}><Text style={styles.pickCardLockText}>Premium Unlock</Text></View>}
                <Text style={styles.pickMatch} numberOfLines={2}>{pick.match}</Text>
                <View style={styles.confidenceRow}>
                  <View style={styles.confidenceBarBg}><View style={[styles.confidenceBarFill, { width: `${pick.confidence}%` }]} /></View>
                  <Text style={styles.confidencePct}>{pick.confidence}%</Text>
                </View>
                <Text style={styles.pickReason} numberOfLines={1}>{pick.reason}</Text>
              </View>
            ))}
          </ScrollView>
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
              <Text style={styles.pricingName}>Premium</Text>
              <Text style={styles.pricingPrice}>$29.99/mo</Text>
              <Text style={styles.pricingDesc}>Unlimited AI, ad-free, priority props, custom alerts</Text>
              <Text style={styles.pricingTrial}>7-Day Free Trial • Cancel anytime</Text>
            </View>
          </View>
          <View style={styles.pricingCardPro}>
            <View style={styles.proAvailableRow}>
              <Text style={styles.proAvailablePill}>Available now</Text>
            </View>
            <Text style={styles.pricingName}>Pro</Text>
            <Text style={styles.pricingPrice}>$9.99/mo</Text>
            <Text style={styles.pricingDesc}>
              Everything in Premium, plus challenges, leaderboards, and the full player-props experience.
            </Text>
            <TouchableOpacity style={styles.proCtaOutline} onPress={handleStartTrial} activeOpacity={0.85}>
              <Text style={styles.proCtaOutlineText}>Get Pro in the app</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.trialButton} onPress={handleStartTrial}>
            <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
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
  pickCardLock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 20, 40, 0.75)',
    borderRadius: theme.radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickCardLockText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
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
