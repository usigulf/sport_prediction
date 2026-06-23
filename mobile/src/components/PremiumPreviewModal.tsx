/**
 * Read-only Premium plan comparison for pre-auth users (Landing).
 * No purchase — Register CTA only (H-13).
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { PLAN_MATRIX } from '../constants/planFeatures';
import {
  PREMIUM_MONTHLY_PRICE_LABEL,
  PREMIUM_TRIAL_DAYS,
} from '../constants/subscriptionPricing';
import { PRICING_FREE_LEAGUES_LINE } from '../constants/leagues';

type Props = {
  visible: boolean;
  onClose: () => void;
  onRegister: () => void;
};

function FeatureList({ items, accent }: { items: readonly string[]; accent?: boolean }) {
  return (
    <View style={styles.featureList}>
      {items.map((line) => (
        <View key={line} style={styles.featureRow}>
          <Ionicons
            name={accent ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={accent ? theme.colors.accent : theme.colors.textMuted}
            style={styles.featureIcon}
          />
          <Text style={styles.featureText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

export function PremiumPreviewModal({ visible, onClose, onRegister }: Props) {
  const handleRegister = () => {
    onClose();
    onRegister();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Free vs Premium</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            Compare plans before you sign up. Subscriptions are managed in the app after you
            create a free account — no charge on this screen.
          </Text>

          <View style={styles.planRow}>
            <View style={styles.planCard}>
              <Text style={styles.planName}>Free</Text>
              <Text style={styles.planPrice}>$0</Text>
              <Text style={styles.planBlurb}>{PRICING_FREE_LEAGUES_LINE}</Text>
              <FeatureList items={PLAN_MATRIX.free} />
            </View>

            <View style={[styles.planCard, styles.planCardPremium]}>
              <Text style={styles.planName}>Premium</Text>
              <Text style={styles.planPrice}>{PREMIUM_MONTHLY_PRICE_LABEL}/mo</Text>
              <Text style={styles.planTrial}>
                {PREMIUM_TRIAL_DAYS}-day free trial · Cancel anytime
              </Text>
              <FeatureList items={PLAN_MATRIX.premium} accent />
            </View>
          </View>

          <Text style={styles.footnote}>
            {Platform.OS === 'ios'
              ? 'Payment is charged to your Apple ID after trial confirmation. Manage or cancel in Settings → Apple ID → Subscriptions.'
              : 'Subscribe after creating your account. Cancel anytime from your app store subscription settings.'}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={handleRegister}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Create free account</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Keep browsing</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderSubtle,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    minHeight: theme.minTouchSize,
    minWidth: theme.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  planRow: {
    gap: theme.spacing.md,
  },
  planCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  planCardPremium: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentDim,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  planBlurb: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  planTrial: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  featureList: {
    gap: theme.spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  footnote: {
    marginTop: theme.spacing.lg,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderSubtle,
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    minHeight: theme.minTouchSize,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.background,
  },
  secondaryButton: {
    minHeight: theme.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
