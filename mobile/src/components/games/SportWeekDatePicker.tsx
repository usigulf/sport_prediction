import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { weekRangeLabel, type WeekDay } from '../../utils/sportsWeek';

type Props = {
  days: WeekDay[];
  dayIndex: number;
  onDayIndexChange: (index: number) => void;
  onWeekOffsetChange: (updater: (w: number) => number) => void;
  hint: string;
};

export function SportWeekDatePicker({
  days,
  dayIndex,
  onDayIndexChange,
  onWeekOffsetChange,
  hint,
}: Props) {
  return (
    <View style={styles.hub}>
      <View style={styles.weekNavRow}>
        <TouchableOpacity
          onPress={() => onWeekOffsetChange((w) => w - 1)}
          style={styles.weekNavBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous week"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.accent} />
        </TouchableOpacity>
        <Text style={styles.weekNavLabel}>{weekRangeLabel(days)}</Text>
        <TouchableOpacity
          onPress={() => onWeekOffsetChange((w) => w + 1)}
          style={styles.weekNavBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next week"
        >
          <Ionicons name="chevron-forward" size={22} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>{hint}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStrip}
      >
        {days.map((d, i) => (
          <TouchableOpacity
            key={d.ymd}
            style={[
              styles.dayChip,
              dayIndex === i && styles.dayChipActive,
              d.isToday && styles.dayChipToday,
            ]}
            onPress={() => onDayIndexChange(i)}
            accessibilityRole="button"
            accessibilityLabel={`${d.weekdayShort} ${d.dayNum}`}
            accessibilityState={{ selected: dayIndex === i }}
          >
            <Text style={[styles.dayChipWeekday, dayIndex === i && styles.dayChipTextActive]}>
              {d.weekdayShort}
            </Text>
            <Text style={[styles.dayChipNum, dayIndex === i && styles.dayChipTextActive]}>
              {d.dayNum}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hub: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    marginTop: theme.spacing.sm,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  weekNavBtn: {
    padding: theme.spacing.xs,
    minWidth: theme.minTouchSize,
    alignItems: 'center',
  },
  weekNavLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  dayStrip: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
    gap: 8,
    paddingBottom: theme.spacing.sm,
  },
  dayChip: {
    width: 48,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  dayChipToday: {
    borderColor: theme.colors.accent,
  },
  dayChipActive: {
    backgroundColor: theme.colors.accentDim,
    borderColor: theme.colors.accent,
  },
  dayChipWeekday: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  dayChipNum: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  dayChipTextActive: {
    color: theme.colors.accent,
  },
});
