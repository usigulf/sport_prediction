import React, { useEffect, useState } from 'react';
import { Image, ImageContentFit } from 'expo-image';
import { ImageStyle, StyleProp, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { CDN_IMAGE_HEADERS, TEAM_LOGOS_ENABLED } from '../utils/teamLogoUrl';

function CrestPlaceholder({
  style,
  fallbackLabel,
}: {
  style: StyleProp<ImageStyle>;
  fallbackLabel?: string;
}) {
  const letter = fallbackLabel?.trim().slice(0, 1).toUpperCase();
  return (
    <View style={[style, styles.placeholder]} accessibilityRole="image">
      {letter ? (
        <Text style={styles.placeholderLetter}>{letter}</Text>
      ) : (
        <Ionicons name="shield-outline" size={20} color={theme.colors.textMuted} />
      )}
    </View>
  );
}

/**
 * Team crest slot — remote logos when `TEAM_LOGOS_ENABLED`; otherwise initials / shield only.
 */
export function TeamCrestImage(props: {
  candidates: string[];
  style: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  fallbackLabel?: string;
}) {
  const { candidates, style, contentFit = 'contain', fallbackLabel } = props;
  const [index, setIndex] = useState(0);
  const resetKey = candidates.join('\0');

  useEffect(() => {
    setIndex(0);
  }, [resetKey]);

  if (!TEAM_LOGOS_ENABLED || candidates.length === 0) {
    return <CrestPlaceholder style={style} fallbackLabel={fallbackLabel} />;
  }

  const uri = candidates[index];
  if (!uri) {
    return <CrestPlaceholder style={style} fallbackLabel={fallbackLabel} />;
  }

  return (
    <Image
      source={{ uri, headers: CDN_IMAGE_HEADERS }}
      style={style}
      contentFit={contentFit}
      accessibilityIgnoresInvertColors
      onError={() => {
        setIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 8,
  },
  placeholderLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
});
