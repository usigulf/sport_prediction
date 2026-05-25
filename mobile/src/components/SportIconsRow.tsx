/**
 * Home sport shortcuts: Soccer, NFL, NBA — equal columns, tap → Games with league selected.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { HOME_SPORT_IDS, SPORT_OPTIONS } from '../constants/leagues';
import { HOME_SPORT_LOGO } from '../constants/sportLogos';

const LOGO_INNER = 34;
const CIRCLE_SIZE = 56;

export interface SportIconsRowProps {
  onSportPress: (sportId: string) => void;
}

export function SportIconsRow({ onSportPress }: SportIconsRowProps) {
  const sports = HOME_SPORT_IDS.map((id) => ({
    id,
    label: SPORT_OPTIONS.find((s) => s.id === id)?.label ?? id.toUpperCase(),
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {sports.map((sport) => (
          <TouchableOpacity
            key={sport.id}
            style={styles.iconButton}
            onPress={() => onSportPress(sport.id)}
            activeOpacity={0.8}
            accessibilityLabel={`Filter by ${sport.label}`}
            accessibilityRole="button"
          >
            <View style={styles.circle}>
              {sport.id === 'soccer' || sport.id === 'nfl' || sport.id === 'nba' ? (
                <Image
                  source={HOME_SPORT_LOGO[sport.id]}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Ionicons name="football-outline" size={22} color={theme.colors.accent} />
              )}
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {sport.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingVertical: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  iconButton: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: theme.spacing.xs,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  logo: {
    width: LOGO_INNER,
    height: LOGO_INNER,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
