import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PREMIUM_PROPS_UNLOCK_CONTEXT } from '../../constants/premiumCopy';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../constants/theme';
import type { PlayerPropItem } from './types';
import { gameDetailStyles as s } from './gameDetailStyles';

type Nav = StackNavigationProp<RootStackParamList>;

type Props = {
  isPremium: boolean;
  playerPropsNamed: boolean;
  playerPropsDisclaimer: string | null;
  playerPropsLoading: boolean;
  playerPropsError: string | null;
  playerProps: PlayerPropItem[];
  navigation: Nav;
};

export function GameDetailPlayerPropsSection({
  isPremium,
  playerPropsNamed,
  playerPropsDisclaimer,
  playerPropsLoading,
  playerPropsError,
  playerProps,
  navigation,
}: Props) {
  return (
    <View style={s.infoSection}>
      <Text style={s.sectionTitle}>
        {playerPropsNamed ? 'Player props' : 'Player props (model est.)'}
      </Text>
      {isPremium ? (
        <>
          <Text style={s.mutedText}>
            {playerPropsDisclaimer ??
              'Model projections from team scores and spotlight players — not sportsbook lines.'}
          </Text>
          {playerPropsLoading ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.accent}
              style={s.playerPropsLoader}
            />
          ) : playerPropsError ? (
            <Text style={s.playerPropsError}>{playerPropsError}</Text>
          ) : playerProps.length === 0 ? (
            <Text style={s.mutedText}>No player props for this game yet.</Text>
          ) : (
            playerProps.map((prop, i) => (
              <View key={i} style={s.propRow}>
                <Text style={s.propPlayer}>{prop.player_name}</Text>
                <Text style={s.propMeta}>
                  {prop.prop_type} — model line {prop.line} {prop.unit}
                  {prop.confidence_level ? ` · ${prop.confidence_level}` : ''}
                </Text>
                <Text style={s.propPredicted}>
                  Projected: {prop.predicted_value} {prop.unit}
                </Text>
              </View>
            ))
          )}
        </>
      ) : (
        <>
          <Text style={s.mutedText}>Upgrade to Premium to view player prop predictions.</Text>
          <TouchableOpacity
            style={s.upgradeButton}
            onPress={() =>
              navigation.navigate('Paywall', {
                emphasizeTier: 'premium',
                contextMessage: PREMIUM_PROPS_UNLOCK_CONTEXT,
              })
            }
          >
            <Text style={s.upgradeButtonText}>View Premium</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
