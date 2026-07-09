import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useLayout } from '../hooks/useLayout';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Centers main tab content on tablet-width screens (≥768px). */
export function WideContent({ children, style, contentStyle }: Props) {
  const { isWide, contentMaxWidth, horizontalPadding } = useLayout();
  const innerStyle = useMemo(
    () =>
      isWide
        ? { width: contentMaxWidth, alignSelf: 'center' as const, flex: 1 }
        : { flex: 1 },
    [isWide, contentMaxWidth],
  );

  return (
    <View style={[isWide && { paddingHorizontal: horizontalPadding, flex: 1 }, style]}>
      <View style={[innerStyle, contentStyle]}>{children}</View>
    </View>
  );
}
