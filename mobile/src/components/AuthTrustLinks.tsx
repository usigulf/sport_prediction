import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';

type AuthTrustLinksProps = {
  style?: ViewStyle;
};

/**
 * Pre-auth navigation to public trust screens (same routes exist on authenticated stack).
 */
export function AuthTrustLinks({ style }: AuthTrustLinksProps) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Accuracy')}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Model accuracy"
      >
        <Text style={styles.link}>Model accuracy</Text>
      </TouchableOpacity>
      <Text style={styles.sep}>·</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Help')}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="FAQ and trust"
      >
        <Text style={styles.link}>FAQ & trust</Text>
      </TouchableOpacity>
      <Text style={styles.sep}>·</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('PrivacyPolicy')}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Privacy policy"
      >
        <Text style={styles.link}>Privacy</Text>
      </TouchableOpacity>
      <Text style={styles.sep}>·</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('TermsOfService')}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Terms of service"
      >
        <Text style={styles.link}>Terms</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
    textDecorationLine: 'underline',
  },
  sep: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
