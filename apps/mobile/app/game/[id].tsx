import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { predictionsApi } from '@/services/api/predictions';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useAuthStore } from '@/stores/authStore';
import type {
  GamePrediction,
  LivePrediction,
  PropPrediction,
  PredictionExplanation,
  ScenarioCondition,
} from '@/types/predictions';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'props' | 'scenario'>('overview');
  const [liveData, setLiveData] = useState<LivePrediction | null>(null);
  const { subscription } = useAuthStore();
  const { subscribe, unsubscribe, onLivePrediction } = useWebSocket();

  const { data: prediction, isLoading, refetch } = useQuery({
    queryKey: ['prediction', id],
    queryFn: () => predictionsApi.getGamePrediction(id!),
    enabled: !!id,
  });

  const { data: props } = useQuery({
    queryKey: ['props', id],
    queryFn: () => predictionsApi.getPropPredictions(id!),
    enabled: !!id && activeTab === 'props',
  });

  // Subscribe to live updates if game is live
  useEffect(() => {
    if (prediction?.status === 'live' && id) {
      subscribe(id);
      const cleanup = onLivePrediction((data) => {
        if (data.gameId === id) {
          setLiveData(data);
        }
      });
      return () => {
        unsubscribe(id);
        cleanup();
      };
    }
  }, [prediction?.status, id, subscribe, unsubscribe, onLivePrediction]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-dark-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!prediction) {
    return (
      <View className="flex-1 bg-dark-900 items-center justify-center px-6">
        <Text className="text-white text-lg">Game not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-emerald-400">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isLive = prediction.status === 'live';
  const isPro = subscription?.plan !== 'free';

  return (
    <>
      <Stack.Screen
        options={{
          title: `${prediction.awayTeam.abbreviation} @ ${prediction.homeTeam.abbreviation}`,
          headerRight: () => (
            isLive && (
              <View className="flex-row items-center mr-2">
                <View className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                <Text className="text-red-400 text-xs font-medium">LIVE</Text>
              </View>
            )
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-dark-900"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* Game Header */}
        <GameHeader prediction={prediction} liveData={liveData} />

        {/* Tab Selector */}
        <View className="flex-row px-4 py-3 border-b border-dark-800">
          {(['overview', 'props', 'scenario'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg mr-2 last:mr-0 ${
                activeTab === tab ? 'bg-emerald-600' : 'bg-dark-800'
              }`}
            >
              <Text className={`text-center text-sm font-medium capitalize ${
                activeTab === tab ? 'text-white' : 'text-dark-400'
              }`}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <View className="px-4 py-4">
          {activeTab === 'overview' && (
            <OverviewTab prediction={prediction} liveData={liveData} />
          )}
          {activeTab === 'props' && (
            <PropsTab props={props || []} isPro={isPro} />
          )}
          {activeTab === 'scenario' && (
            <ScenarioTab gameId={id!} prediction={prediction} isPro={isPro} />
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </>
  );
}

// ============ Game Header ============

interface GameHeaderProps {
  prediction: GamePrediction;
  liveData: LivePrediction | null;
}

function GameHeader({ prediction, liveData }: GameHeaderProps) {
  const { homeTeam, awayTeam, startTime, venue, status, sport } = prediction;
  const isLive = status === 'live';

  const gameTime = new Date(startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View className="px-4 py-6 border-b border-dark-800">
      {/* Sport & Time */}
      <View className="flex-row items-center justify-center mb-4">
        <View className="bg-dark-700 px-3 py-1 rounded">
          <Text className="text-xs font-medium text-dark-300">{sport.toUpperCase()}</Text>
        </View>
        {!isLive && (
          <Text className="text-dark-400 text-sm ml-3">{gameTime}</Text>
        )}
      </View>

      {/* Teams & Score */}
      <View className="flex-row items-center justify-between">
        {/* Away Team */}
        <View className="flex-1 items-center">
          <View className="w-16 h-16 rounded-full bg-dark-700 items-center justify-center mb-2">
            <Text className="text-2xl font-bold text-white">{awayTeam.abbreviation}</Text>
          </View>
          <Text className="text-white font-medium text-center">{awayTeam.name}</Text>
          <Text className="text-dark-500 text-xs">{awayTeam.record}</Text>
          {isLive && liveData && (
            <Text className="text-3xl font-bold text-white mt-2">
              {liveData.currentScore.away}
            </Text>
          )}
        </View>

        {/* Center */}
        <View className="px-4 items-center">
          {isLive && liveData ? (
            <>
              <Text className="text-dark-400 text-xs">{liveData.currentScore.period}</Text>
              <Text className="text-white font-mono text-lg">{liveData.currentScore.clock}</Text>
            </>
          ) : (
            <>
              <Text className="text-dark-500 text-2xl">@</Text>
              {venue && (
                <Text className="text-dark-500 text-xs mt-1 text-center">{venue}</Text>
              )}
            </>
          )}
        </View>

        {/* Home Team */}
        <View className="flex-1 items-center">
          <View className="w-16 h-16 rounded-full bg-dark-700 items-center justify-center mb-2">
            <Text className="text-2xl font-bold text-white">{homeTeam.abbreviation}</Text>
          </View>
          <Text className="text-white font-medium text-center">{homeTeam.name}</Text>
          <Text className="text-dark-500 text-xs">{homeTeam.record}</Text>
          {isLive && liveData && (
            <Text className="text-3xl font-bold text-white mt-2">
              {liveData.currentScore.home}
            </Text>
          )}
        </View>
      </View>

      {/* Live Win Probability */}
      {isLive && liveData && (
        <View className="mt-4 pt-4 border-t border-dark-700">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-dark-400">
              {awayTeam.abbreviation} {Math.round(liveData.winProbability.away * 100)}%
            </Text>
            <Text className="text-xs text-dark-400">
              {Math.round(liveData.winProbability.home * 100)}% {homeTeam.abbreviation}
            </Text>
          </View>
          <View className="h-3 rounded-full bg-dark-700 overflow-hidden flex-row">
            <View
              className="h-full bg-blue-500"
              style={{ width: `${liveData.winProbability.away * 100}%` }}
            />
            <View
              className="h-full bg-emerald-500"
              style={{ width: `${liveData.winProbability.home * 100}%` }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

// ============ Overview Tab ============

interface OverviewTabProps {
  prediction: GamePrediction;
  liveData: LivePrediction | null;
}

function OverviewTab({ prediction, liveData }: OverviewTabProps) {
  const { predictions: preds, homeTeam, awayTeam, explanations } = prediction;
  const isLive = prediction.status === 'live';

  return (
    <View>
      {/* Main Predictions */}
      <View className="rounded-xl bg-dark-800 p-4 mb-4">
        <Text className="text-lg font-semibold text-white mb-4">Predictions</Text>

        {/* Spread */}
        <PredictionRow
          label="Spread"
          pick={`${preds.spread.pick === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation} ${preds.spread.spread > 0 ? '+' : ''}${preds.spread.spread}`}
          confidence={preds.spread.confidence}
          edge={preds.spread.edge}
          subtext={`Fair line: ${preds.spread.fairSpread > 0 ? '+' : ''}${preds.spread.fairSpread}`}
        />

        <View className="h-px bg-dark-700 my-3" />

        {/* Total */}
        <PredictionRow
          label="Total"
          pick={`${preds.total.pick.charAt(0).toUpperCase() + preds.total.pick.slice(1)} ${preds.total.line}`}
          confidence={preds.total.confidence}
          edge={preds.total.edge}
          subtext={`Projected: ${preds.total.projectedTotal.toFixed(1)}`}
        />

        <View className="h-px bg-dark-700 my-3" />

        {/* Moneyline */}
        <PredictionRow
          label="Moneyline"
          pick={preds.moneyline.pick === 'home' ? homeTeam.name : awayTeam.name}
          confidence={preds.moneyline.winProbability}
          edge={preds.moneyline.edge}
          subtext={`Win prob: ${(preds.moneyline.winProbability * 100).toFixed(1)}%`}
        />
      </View>

      {/* Live Edge (if live) */}
      {isLive && liveData?.liveSpread && (
        <View className="rounded-xl bg-red-900/20 border border-red-800/50 p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            <Text className="text-lg font-semibold text-white">Live Edge</Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-xs text-dark-400">Current Line</Text>
              <Text className="text-white font-medium">
                {homeTeam.abbreviation} {liveData.liveSpread.line > 0 ? '+' : ''}{liveData.liveSpread.line}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-dark-400">Model Fair Line</Text>
              <Text className="text-white font-medium">
                {liveData.liveSpread.modelFairLine > 0 ? '+' : ''}{liveData.liveSpread.modelFairLine.toFixed(1)}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-dark-400">Edge</Text>
              <Text className={`font-bold ${liveData.liveSpread.edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {liveData.liveSpread.edge > 0 ? '+' : ''}{liveData.liveSpread.edge.toFixed(1)} pts
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Explanations */}
      {explanations && explanations.length > 0 && (
        <View className="rounded-xl bg-dark-800 p-4">
          <Text className="text-lg font-semibold text-white mb-1">Why This Pick?</Text>
          <Text className="text-xs text-dark-400 mb-4">Top factors influencing our prediction</Text>

          {explanations.slice(0, 8).map((exp, index) => (
            <ExplanationRow key={index} explanation={exp} />
          ))}
        </View>
      )}
    </View>
  );
}

interface PredictionRowProps {
  label: string;
  pick: string;
  confidence: number;
  edge: number;
  subtext: string;
}

function PredictionRow({ label, pick, confidence, edge, subtext }: PredictionRowProps) {
  const confPercent = Math.round(confidence * 100);

  return (
    <View className="flex-row items-center">
      <View className="flex-1">
        <Text className="text-dark-400 text-xs">{label}</Text>
        <Text className="text-white font-semibold text-lg">{pick}</Text>
        <Text className="text-dark-500 text-xs">{subtext}</Text>
      </View>
      <View className="items-end">
        <View className={`px-2 py-1 rounded ${confPercent >= 60 ? 'bg-emerald-600/20' : 'bg-dark-700'}`}>
          <Text className={`text-sm font-medium ${confPercent >= 60 ? 'text-emerald-400' : 'text-dark-300'}`}>
            {confPercent}%
          </Text>
        </View>
        <Text className={`text-xs mt-1 ${edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {edge > 0 ? '+' : ''}{edge.toFixed(1)} edge
        </Text>
      </View>
    </View>
  );
}

function ExplanationRow({ explanation }: { explanation: PredictionExplanation }) {
  const isPositive = explanation.direction === 'positive';

  return (
    <View className="flex-row items-center py-2 border-b border-dark-700 last:border-b-0">
      <View className={`w-1 h-8 rounded mr-3 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <View className="flex-1">
        <Text className="text-white text-sm">{explanation.factor}</Text>
        <Text className="text-dark-500 text-xs">{explanation.description}</Text>
      </View>
      <Text className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{(explanation.impact * 100).toFixed(1)}%
      </Text>
    </View>
  );
}

// ============ Props Tab ============

interface PropsTabProps {
  props: PropPrediction[];
  isPro: boolean;
}

function PropsTab({ props, isPro }: PropsTabProps) {
  if (!isPro) {
    return (
      <View className="rounded-xl bg-dark-800 p-6 items-center">
        <Ionicons name="lock-closed" size={48} color="#64748B" />
        <Text className="text-white font-semibold text-lg mt-4">Pro Feature</Text>
        <Text className="text-dark-400 text-center mt-2">
          Upgrade to Pro to access player prop predictions with detailed analysis.
        </Text>
        <Pressable className="mt-4 bg-emerald-600 px-6 py-2 rounded-lg">
          <Text className="text-white font-medium">Upgrade Now</Text>
        </Pressable>
      </View>
    );
  }

  if (props.length === 0) {
    return (
      <View className="rounded-xl bg-dark-800 p-6 items-center">
        <Text className="text-dark-400">No player props available for this game.</Text>
      </View>
    );
  }

  // Group by player
  const byPlayer = props.reduce((acc, prop) => {
    if (!acc[prop.playerId]) {
      acc[prop.playerId] = { name: prop.playerName, team: prop.playerTeam, props: [] };
    }
    acc[prop.playerId].props.push(prop);
    return acc;
  }, {} as Record<string, { name: string; team: string; props: PropPrediction[] }>);

  return (
    <View>
      {Object.entries(byPlayer).map(([playerId, player]) => (
        <View key={playerId} className="rounded-xl bg-dark-800 p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-full bg-dark-700 items-center justify-center mr-3">
              <Text className="text-white font-bold">{player.name[0]}</Text>
            </View>
            <View>
              <Text className="text-white font-medium">{player.name}</Text>
              <Text className="text-dark-400 text-xs">{player.team}</Text>
            </View>
          </View>

          {player.props.map((prop) => (
            <View key={prop.id} className="flex-row items-center py-2 border-t border-dark-700">
              <View className="flex-1">
                <Text className="text-dark-400 text-xs capitalize">{prop.propType.replace('_', ' ')}</Text>
                <Text className="text-white">
                  {prop.pick.charAt(0).toUpperCase() + prop.pick.slice(1)} {prop.line}
                </Text>
              </View>
              <View className="items-end">
                <Text className={`text-sm font-medium ${prop.confidence >= 0.6 ? 'text-emerald-400' : 'text-dark-300'}`}>
                  {Math.round(prop.confidence * 100)}%
                </Text>
                <Text className="text-dark-500 text-xs">
                  Proj: {prop.projectedValue.toFixed(1)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ============ Scenario Tab ============

interface ScenarioTabProps {
  gameId: string;
  prediction: GamePrediction;
  isPro: boolean;
}

function ScenarioTab({ gameId, prediction, isPro }: ScenarioTabProps) {
  const [conditions, setConditions] = useState<ScenarioCondition[]>([]);

  const { mutate: runScenario, data: result, isPending } = useMutation({
    mutationFn: () => predictionsApi.runScenario(gameId, { conditions }),
  });

  if (!isPro) {
    return (
      <View className="rounded-xl bg-dark-800 p-6 items-center">
        <Ionicons name="flask" size={48} color="#64748B" />
        <Text className="text-white font-semibold text-lg mt-4">Elite Feature</Text>
        <Text className="text-dark-400 text-center mt-2">
          Upgrade to Elite to access the Scenario Engine and run what-if analyses.
        </Text>
        <Pressable className="mt-4 bg-emerald-600 px-6 py-2 rounded-lg">
          <Text className="text-white font-medium">Upgrade to Elite</Text>
        </Pressable>
      </View>
    );
  }

  const toggleCondition = (condition: ScenarioCondition) => {
    const exists = conditions.find((c) => c.key === condition.key);
    if (exists) {
      setConditions(conditions.filter((c) => c.key !== condition.key));
    } else {
      setConditions([...conditions, condition]);
    }
  };

  const sampleConditions: ScenarioCondition[] = [
    { type: 'player_status', key: 'star_player_out', value: true, label: 'Star player sits' },
    { type: 'player_status', key: 'star_player_in', value: true, label: 'Star player returns' },
    { type: 'time_weight', key: 'recent_only', value: 10, label: 'Weight last 10 games' },
    { type: 'time_weight', key: 'season_weight', value: 'full', label: 'Full season weight' },
  ];

  return (
    <View>
      <View className="rounded-xl bg-dark-800 p-4 mb-4">
        <Text className="text-lg font-semibold text-white mb-1">Scenario Engine</Text>
        <Text className="text-dark-400 text-xs mb-4">
          Toggle conditions to see how the prediction changes
        </Text>

        {sampleConditions.map((cond) => {
          const isActive = conditions.some((c) => c.key === cond.key);
          return (
            <Pressable
              key={cond.key}
              onPress={() => toggleCondition(cond)}
              className={`flex-row items-center p-3 rounded-lg mb-2 ${
                isActive ? 'bg-emerald-600/20 border border-emerald-600' : 'bg-dark-700'
              }`}
            >
              <View className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                isActive ? 'border-emerald-500 bg-emerald-500' : 'border-dark-500'
              }`}>
                {isActive && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <Text className={isActive ? 'text-white' : 'text-dark-300'}>{cond.label}</Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => runScenario()}
          disabled={conditions.length === 0 || isPending}
          className={`mt-4 py-3 rounded-lg items-center ${
            conditions.length === 0 ? 'bg-dark-700' : 'bg-emerald-600'
          }`}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className={`font-medium ${conditions.length === 0 ? 'text-dark-500' : 'text-white'}`}>
              Run Scenario
            </Text>
          )}
        </Pressable>
      </View>

      {/* Results */}
      {result && (
        <View className="rounded-xl bg-dark-800 p-4">
          <Text className="text-lg font-semibold text-white mb-4">Scenario Result</Text>

          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 items-center">
              <Text className="text-dark-400 text-xs">Original</Text>
              <Text className="text-white text-lg font-medium">
                {result.originalPrediction.spread > 0 ? '+' : ''}{result.originalPrediction.spread}
              </Text>
              <Text className="text-dark-500 text-xs">
                {Math.round(result.originalPrediction.confidence * 100)}% conf
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={24} color="#64748B" />

            <View className="flex-1 items-center">
              <Text className="text-dark-400 text-xs">Adjusted</Text>
              <Text className="text-emerald-400 text-lg font-medium">
                {result.adjustedPrediction.spread > 0 ? '+' : ''}{result.adjustedPrediction.spread}
              </Text>
              <Text className="text-dark-500 text-xs">
                {Math.round(result.adjustedPrediction.confidence * 100)}% conf
              </Text>
            </View>
          </View>

          <View className="bg-dark-700 rounded-lg p-3">
            <Text className="text-dark-400 text-xs mb-2">Impact Breakdown</Text>
            {result.conditionImpacts.map((impact, i) => (
              <View key={i} className="flex-row justify-between py-1">
                <Text className="text-white text-sm">{impact.condition}</Text>
                <Text className={`text-sm ${impact.impact > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {impact.impact > 0 ? '+' : ''}{impact.impact.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
