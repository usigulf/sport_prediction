/**
 * Reliability diagram: predicted probability buckets vs actual hit rate.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CalibrationBucket } from '../services/api';
import { theme } from '../constants/theme';

const CHART_HEIGHT = 168;
const PADDING_LEFT = 28;
const PADDING_RIGHT = 8;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 28;

type Props = {
  buckets: CalibrationBucket[];
  width: number;
};

export const CalibrationChart: React.FC<Props> = ({ buckets, width }) => {
  const plotWidth = Math.max(width - PADDING_LEFT - PADDING_RIGHT, 120);
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const barSlot = plotWidth / buckets.length;
  const barWidth = Math.max(barSlot * 0.55, 4);

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <View style={[styles.wrap, { width }]}>
      <View style={[styles.plot, { height: CHART_HEIGHT }]}>
        {yTicks.map((tick) => {
          const y = PADDING_TOP + plotHeight * (1 - tick / 100);
          return (
            <React.Fragment key={tick}>
              <View style={[styles.gridLine, { top: y, left: PADDING_LEFT, width: plotWidth }]} />
              <Text style={[styles.yLabel, { top: y - 7, left: 0 }]}>{tick}%</Text>
            </React.Fragment>
          );
        })}

        {buckets.map((bucket, i) => {
          if (bucket.count === 0 || bucket.actual_rate_pct == null) return null;
          const barH = (bucket.actual_rate_pct / 100) * plotHeight;
          const centerX = PADDING_LEFT + i * barSlot + barSlot / 2;
          const predictedPct = Math.round(bucket.predicted_mid * 100);
          return (
            <View
              key={`${bucket.bin_start}-${bucket.bin_end}`}
              style={[
                styles.bar,
                {
                  left: centerX - barWidth / 2,
                  width: barWidth,
                  height: barH,
                  bottom: PADDING_BOTTOM,
                },
              ]}
              accessibilityLabel={`${predictedPct}% predicted bucket, ${bucket.actual_rate_pct}% actual, ${bucket.count} games`}
            />
          );
        })}
      </View>

      <View style={[styles.xLabels, { paddingLeft: PADDING_LEFT, width }]}>
        {buckets
          .filter((_, i) => i % 2 === 0)
          .map((bucket) => (
            <Text key={bucket.bin_start} style={[styles.xLabel, { width: barSlot * 2 }]}>
              {Math.round(bucket.predicted_mid * 100)}%
            </Text>
          ))}
      </View>
      <Text style={styles.caption}>
        Bars = actual hit rate per predicted-probability bucket (higher on diagonal = better calibrated).
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
  },
  plot: {
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    opacity: 0.6,
  },
  yLabel: {
    position: 'absolute',
    width: PADDING_LEFT - 4,
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'right',
  },
  bar: {
    position: 'absolute',
    backgroundColor: theme.colors.accent,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.9,
  },
  xLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  xLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  caption: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 16,
  },
});
