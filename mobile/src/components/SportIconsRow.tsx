/**
 * Horizontal row of 5–6 circular sport icons for quick filter.
 * Tap → onSportPress(sportId). Use to open Games tab with league pre-selected.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { SPORT_OPTIONS } from '../constants/leagues';
import { HOME_SPORT_IDS } from '../constants/leagues';

const getSportIcon = (sportId: string): keyof typeof Ionicons.glyphMap => {
  switch (sportId) {
    case 'nfl': return 'football';
    case 'nba': return 'basketball';
    case 'mlb': return 'baseball';
    case 'nhl': return 'snow';
    case 'soccer': return 'football';
    case 'golf': return 'trophy';
    default: return 'football-outline';
  }
};

const ICON_SIZE = 44;
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
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
              <Ionicons
                name={getSportIcon(sport.id)}
                size={ICON_SIZE * 0.6}
                color={theme.colors.accent}
              />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {sport.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingVertical: theme.spacing.sm,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconButton: {
    alignItems: 'center',
    minWidth: CIRCLE_SIZE + 8,
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
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
