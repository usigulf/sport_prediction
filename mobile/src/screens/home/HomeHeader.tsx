import React from 'react';
import { View, Text } from 'react-native';
import { OctobetiQWordmark } from '../../components/OctobetiQWordmark';
import { HOME_HEADER_SUBTITLE } from '../../constants/leagues';
import { formatCachedAt } from './homeScreenUtils';
import { homeScreenStyles as styles } from './homeScreenStyles';

type Props = {
  cachedAt: string | null;
  loadError: string | null;
};

export function HomeHeader({ cachedAt, loadError }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.logoContainer}>
          <View style={styles.headerTextContainer}>
            <OctobetiQWordmark variant="header" />
            <Text style={styles.headerSubtitle}>{HOME_HEADER_SUBTITLE}</Text>
          </View>
        </View>
      </View>
      {cachedAt && !loadError ? (
        <Text style={styles.lastUpdated}>Updated {formatCachedAt(cachedAt)}</Text>
      ) : null}
    </View>
  );
}
