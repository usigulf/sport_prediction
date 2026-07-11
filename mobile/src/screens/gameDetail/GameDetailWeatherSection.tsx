import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { gameDetailStyles as s } from './gameDetailStyles';

export type GameWeatherPayload = {
  available: boolean;
  reason?: string;
  temp_f?: number | null;
  feels_like_f?: number | null;
  humidity_pct?: number | null;
  wind_mph?: number | null;
  description?: string | null;
  disclaimer?: string | null;
};

type Props = {
  payload: GameWeatherPayload | null;
  loading: boolean;
  league?: string | null;
};

export function GameDetailWeatherSection({ payload, loading, league }: Props) {
  const isOutdoor = (league ?? '').toLowerCase() === 'nfl';
  if (!isOutdoor) return null;

  if (loading) {
    return (
      <View style={s.infoSection}>
        <Text style={s.sectionTitle}>Weather</Text>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  if (!payload) return null;

  return (
    <View style={s.infoSection}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Ionicons name="partly-sunny-outline" size={18} color={theme.colors.accent} />
        <Text style={s.sectionTitle}>Weather (outdoor)</Text>
      </View>
      {payload.available ? (
        <>
          <Text style={s.infoValue}>
            {payload.description ? payload.description.replace(/^\w/, (c) => c.toUpperCase()) : 'Forecast'}
            {payload.temp_f != null ? ` · ${Math.round(payload.temp_f)}°F` : ''}
            {payload.wind_mph != null ? ` · Wind ${Math.round(payload.wind_mph)} mph` : ''}
          </Text>
          {payload.feels_like_f != null || payload.humidity_pct != null ? (
            <Text style={s.mutedText}>
              {payload.feels_like_f != null ? `Feels like ${Math.round(payload.feels_like_f)}°F` : ''}
              {payload.feels_like_f != null && payload.humidity_pct != null ? ' · ' : ''}
              {payload.humidity_pct != null ? `Humidity ${payload.humidity_pct}%` : ''}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={s.mutedText}>
          {payload.reason === 'not_configured'
            ? 'Weather forecast unavailable (WEATHER_API_KEY not set on server).'
            : 'Weather forecast unavailable for this venue.'}
        </Text>
      )}
      {payload.disclaimer ? <Text style={s.mutedText}>{payload.disclaimer}</Text> : null}
    </View>
  );
}
