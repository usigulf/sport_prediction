import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { gameDetailStyles as s } from './gameDetailStyles';

export type InjuryReportItem = {
  player_name: string;
  team_name?: string | null;
  status: string;
  detail?: string | null;
  reported_at_iso?: string | null;
};

type Props = {
  injuries: InjuryReportItem[];
  loading: boolean;
  error: string | null;
  disclaimer?: string | null;
};

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'questionable') return 'Questionable';
  if (s === 'doubtful') return 'Doubtful';
  return 'Out';
}

export function GameDetailInjurySection({ injuries, loading, error, disclaimer }: Props) {
  if (loading) {
    return (
      <View style={s.infoSection}>
        <Text style={s.sectionTitle}>Injury reports</Text>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  if (error) return null;

  return (
    <View style={s.infoSection}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Ionicons name="medkit-outline" size={18} color={theme.colors.accent} />
        <Text style={s.sectionTitle}>Injury reports</Text>
      </View>
      {injuries.length === 0 ? (
        <Text style={s.mutedText}>No structured injury reports for this game yet.</Text>
      ) : (
        injuries.map((row, idx) => (
          <View key={`${row.player_name}-${idx}`} style={{ marginBottom: 10 }}>
            <Text style={s.infoValue}>
              {row.player_name}
              {row.team_name ? ` (${row.team_name})` : ''} — {statusLabel(row.status)}
            </Text>
            {row.detail ? <Text style={s.mutedText}>{row.detail}</Text> : null}
          </View>
        ))
      )}
      {disclaimer ? <Text style={s.mutedText}>{disclaimer}</Text> : null}
    </View>
  );
}
