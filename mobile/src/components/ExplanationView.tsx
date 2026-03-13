import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchExplanation } from '../store/slices/gamesSlice';
import { theme } from '../constants/theme';

interface ExplanationViewProps {
  gameId: string;
  predictionId: string;
}

export const ExplanationView: React.FC<ExplanationViewProps> = ({
  gameId,
  predictionId,
}) => {
  const dispatch = useAppDispatch();
  const { explanation, loadingExplanation } = useAppSelector(
    (state) => state.games
  );

  useEffect(() => {
    dispatch(fetchExplanation({ gameId, predictionId }));
  }, [gameId, predictionId]);

  if (loadingExplanation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Loading explanation...</Text>
      </View>
    );
  }

  if (!explanation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Explanation not available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Why This Prediction?</Text>

      {/* Top Features */}
      {explanation.top_features && explanation.top_features.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Factors</Text>
          {explanation.top_features.map((feature: any, index: number) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureHeader}>
                <Text style={styles.featureName}>{feature.feature}</Text>
                <View
                  style={[
                    styles.shapBadge,
                    {
                      backgroundColor:
                        feature.shap_value > 0 ? theme.colors.accent : theme.colors.secondary,
                    },
                  ]}
                >
                  <Text style={styles.shapValue}>
                    {feature.shap_value > 0 ? '+' : ''}
                    {(feature.shap_value * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
              {feature.description && (
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Confidence Explanation */}
      {explanation.confidence_explanation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidence Level</Text>
          <Text style={styles.explanationText}>
            {explanation.confidence_explanation}
          </Text>
        </View>
      )}

      {/* Model Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Model Version:</Text>
          <Text style={styles.infoValue}>
            {explanation.model_version || 'v1.0.0'}
          </Text>
        </View>
        {explanation.accuracy && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Historical Accuracy:</Text>
            <Text style={styles.infoValue}>
              {(explanation.accuracy * 100).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  featureItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  shapBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    marginLeft: 8,
  },
  shapValue: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  explanationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
