import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

type Props = {
  count?: number;
  variant?: 'card' | 'row';
};

export function FeedSkeleton({ count = 3, variant = 'card' }: Props) {
  return (
    <View style={styles.container} accessibilityLabel="Loading content">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.card, variant === 'row' && styles.rowCard]}
        >
          <View style={styles.line} />
          <View style={[styles.line, styles.lineShort]} />
          <View style={[styles.line, styles.lineMedium]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
  },
  card: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  rowCard: {
    marginHorizontal: theme.spacing.sm,
  },
  line: {
    height: 14,
    backgroundColor: theme.colors.borderSubtle,
    borderRadius: 4,
    width: '90%',
  },
  lineShort: {
    width: '50%',
    marginTop: 8,
  },
  lineMedium: {
    width: '70%',
    marginTop: 8,
  },
});
