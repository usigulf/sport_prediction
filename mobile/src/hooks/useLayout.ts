import { useWindowDimensions } from 'react-native';

const TABLET_MIN_WIDTH = 768;
export const CONTENT_MAX_WIDTH = 640;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= TABLET_MIN_WIDTH;
  const contentMaxWidth = isWide ? CONTENT_MAX_WIDTH : width;

  return {
    width,
    height,
    isWide,
    contentMaxWidth,
    horizontalPadding: isWide ? Math.max(24, (width - CONTENT_MAX_WIDTH) / 2) : 0,
  };
}
