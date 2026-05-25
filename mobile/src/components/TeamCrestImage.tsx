import React, { useEffect, useState } from 'react';
import { Image, ImageContentFit } from 'expo-image';
import { ImageStyle, StyleProp } from 'react-native';
import { CDN_IMAGE_HEADERS } from '../utils/teamLogoUrl';

/**
 * Remote team crests (ESPN CDN). Tries each candidate URL when the previous fails (e.g. stale
 * provider URL in API, then ESPN fallback from abbreviation).
 */
export function TeamCrestImage(props: {
  candidates: string[];
  style: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
}) {
  const { candidates, style, contentFit = 'contain' } = props;
  const [index, setIndex] = useState(0);
  const resetKey = candidates.join('\0');

  useEffect(() => {
    setIndex(0);
  }, [resetKey]);

  const uri = candidates[index];
  if (!uri) return null;

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
