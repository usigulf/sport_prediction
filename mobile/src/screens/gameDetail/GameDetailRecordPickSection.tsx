import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { apiService } from '../../services/api';
import { isSoccerLeague } from '../../constants/leagues';
import { theme } from '../../constants/theme';
import { getUserFriendlyMessage } from '../../utils/errorMessages';
import {
  type PickOutcome,
  probabilityForOutcome,
} from '../../utils/userPickTracking';
import { gameDetailStyles as s } from './gameDetailStyles';

type Props = {
  gameId: string;
  league?: string | null;
  homeName: string;
  awayName: string;
  homeWinProb?: number | null;
  awayWinProb?: number | null;
  gameStatus?: string | null;
  isAuthenticated: boolean;
  marketHomeImplied?: number | null;
  marketAwayImplied?: number | null;
};

type SavedPick = {
  outcome: PickOutcome;
  probability: number;
  source?: string;
};

export function GameDetailRecordPickSection({
  gameId,
  league,
  homeName,
  awayName,
  homeWinProb,
  awayWinProb,
  gameStatus,
  isAuthenticated,
  marketHomeImplied,
  marketAwayImplied,
}: Props) {
  const [saved, setSaved] = useState<SavedPick | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const finished = gameStatus === 'finished' || gameStatus === 'final';
  const soccer = isSoccerLeague(league);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setSaved(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.getUserPickForGame(gameId);
      const pick = res.pick;
      if (pick?.outcome) {
        setSaved({
          outcome: pick.outcome as PickOutcome,
          probability: pick.probability,
          source: pick.source,
        });
      } else {
        setSaved(null);
      }
    } catch {
      setSaved(null);
    } finally {
      setLoading(false);
    }
  }, [gameId, isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (outcome: PickOutcome) => {
    const hp = Number(homeWinProb);
    const ap = Number(awayWinProb);
    if (!Number.isFinite(hp) || !Number.isFinite(ap)) {
      Alert.alert('Pick', 'Model probabilities are not available yet.');
      return;
    }
    const probability = probabilityForOutcome(outcome, hp, ap, league);
    setSaving(true);
    try {
      const res = await apiService.recordUserPick({
        game_id: gameId,
        outcome,
        probability,
        market_home_implied_prob: marketHomeImplied ?? null,
        market_away_implied_prob: marketAwayImplied ?? null,
      });
      setSaved({
        outcome: res.outcome as PickOutcome,
        probability: res.probability,
        source: res.source,
      });
    } catch (e) {
      Alert.alert('Pick', getUserFriendlyMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={s.infoSection} testID="record-pick-section">
        <Text style={s.sectionTitle}>Your pick</Text>
        <Text style={s.mutedText}>
          Sign in to record your own pick. Opening a game no longer auto-saves the model pick as
          yours.
        </Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={s.infoSection} testID="record-pick-section">
        <Text style={s.sectionTitle}>Your pick</Text>
        {loading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : saved ? (
          <Text style={s.mutedText}>
            Saved {saved.outcome} at {(saved.probability * 100).toFixed(0)}% — graded after final.
          </Text>
        ) : (
          <Text style={s.mutedText}>No pick was recorded before kickoff.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={s.infoSection} testID="record-pick-section">
      <Text style={s.sectionTitle}>Record your pick</Text>
      <Text style={s.mutedText}>
        Tap to save your selection. Uses the model probability for that side for Brier tracking —
        not auto-saved from the model pick.
      </Text>
      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 8 }} />
      ) : saved ? (
        <Text style={styles.saved}>
          Saved: {outcomeLabel(saved.outcome, homeName, awayName)} (
          {(saved.probability * 100).toFixed(0)}%)
        </Text>
      ) : (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, saving && styles.btnDisabled]}
            disabled={saving}
            onPress={() => void submit('home')}
            accessibilityRole="button"
            accessibilityLabel={`Pick ${homeName}`}
          >
            <Text style={styles.btnText}>{homeName}</Text>
          </TouchableOpacity>
          {soccer ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnDraw, saving && styles.btnDisabled]}
              disabled={saving}
              onPress={() => void submit('draw')}
              accessibilityRole="button"
              accessibilityLabel="Pick draw"
            >
              <Text style={styles.btnText}>Draw</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.btn, saving && styles.btnDisabled]}
            disabled={saving}
            onPress={() => void submit('away')}
            accessibilityRole="button"
            accessibilityLabel={`Pick ${awayName}`}
          >
            <Text style={styles.btnText}>{awayName}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function outcomeLabel(outcome: PickOutcome, home: string, away: string): string {
  if (outcome === 'home') return home;
  if (outcome === 'away') return away;
  return 'Draw';
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  btn: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.accentDim,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
  },
  btnDraw: {
    backgroundColor: theme.colors.backgroundCard,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  saved: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
  },
});
