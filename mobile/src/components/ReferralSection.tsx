import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';

type Props = {
  enabled?: boolean;
};

export const ReferralSection: React.FC<Props> = ({ enabled = true }) => {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyCode, setApplyCode] = useState('');
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getReferralCode();
      setCode(res.referral_code);
    } catch {
      setCode(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  if (!enabled) return null;

  const shareInvite = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `Try octobetiQ for AI-ranked sports picks. Use my invite code when you sign up: ${code}\nhttps://octobetiq.com`,
        title: 'Invite to octobetiQ',
      });
    } catch {
      /* user dismissed */
    }
  };

  const submitApply = async () => {
    const trimmed = applyCode.trim();
    if (!trimmed) return;
    setApplying(true);
    try {
      const res = await apiService.applyReferralCode(trimmed);
      Alert.alert('Referral', res.message);
      if (res.applied) setApplyCode('');
    } catch (e) {
      Alert.alert('Referral', getUserFriendlyMessage(e));
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="gift-outline" size={18} color={theme.colors.accent} />
        <Text style={styles.title}>Invite a friend</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.accent} />
      ) : (
        <>
          <Text style={styles.codeLabel}>Your invite code</Text>
          <Text style={styles.code} selectable>
            {code ?? '—'}
          </Text>
          <TouchableOpacity style={styles.shareBtn} onPress={() => void shareInvite()} disabled={!code}>
            <Text style={styles.shareBtnText}>Share invite</Text>
          </TouchableOpacity>
          <Text style={styles.applyLabel}>Have a friend's code?</Text>
          <View style={styles.applyRow}>
            <TextInput
              style={styles.input}
              value={applyCode}
              onChangeText={setApplyCode}
              placeholder="Paste invite code"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.applyBtn, applying && styles.applyBtnDisabled]}
              onPress={() => void submitApply()}
              disabled={applying}
            >
              <Text style={styles.applyBtnText}>{applying ? '…' : 'Apply'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Referrals are tracked on your account. Bonus trial days require App Store / Stripe promo setup.
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  codeLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  code: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  shareBtn: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentDim,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: theme.spacing.md,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  applyLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  applyRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 14,
  },
  applyBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.background,
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
  },
});
