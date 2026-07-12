import { apiClient } from './client';
import type {
  GamePrediction,
  LivePrediction,
  PropPrediction,
  ScenarioRequest,
  ScenarioResult,
  AccuracyStats,
} from '@/types/predictions';

export const predictionsApi = {
  /**
   * Get predictions for today's games
   */
  async getTodaysPredictions(sport?: string | null): Promise<GamePrediction[]> {
    const params = sport ? { sport } : {};
    const { data } = await apiClient.get<{ data: GamePrediction[] }>(
      '/v1/predictions/games',
      { params }
    );
    return data.data;
  },

  /**
   * Get predictions for a specific date
   */
  async getPredictionsByDate(date: string, sport?: string): Promise<GamePrediction[]> {
    const params: Record<string, string> = { date };
    if (sport) params.sport = sport;

    const { data } = await apiClient.get<{ data: GamePrediction[] }>(
      '/v1/predictions/games',
      { params }
    );
    return data.data;
  },

  /**
   * Get detailed prediction for a specific game
   */
  async getGamePrediction(gameId: string): Promise<GamePrediction> {
    const { data } = await apiClient.get<{ data: GamePrediction }>(
      `/v1/predictions/games/${gameId}`
    );
    return data.data;
  },

  /**
   * Get live prediction for an in-progress game
   */
  async getLivePrediction(gameId: string): Promise<LivePrediction> {
    const { data } = await apiClient.get<{ data: LivePrediction }>(
      `/v1/predictions/live/${gameId}`
    );
    return data.data;
  },

  /**
   * Get player prop predictions for a game
   */
  async getPropPredictions(
    gameId: string,
    playerId?: string,
    propType?: string
  ): Promise<PropPrediction[]> {
    const params: Record<string, string> = { game_id: gameId };
    if (playerId) params.player_id = playerId;
    if (propType) params.prop_type = propType;

    const { data } = await apiClient.get<{ data: PropPrediction[] }>(
      '/v1/predictions/props',
      { params }
    );
    return data.data;
  },

  /**
   * Run a what-if scenario analysis
   */
  async runScenario(gameId: string, request: ScenarioRequest): Promise<ScenarioResult> {
    const { data } = await apiClient.post<{ data: ScenarioResult }>(
      `/v1/scenarios/${gameId}`,
      request
    );
    return data.data;
  },

  /**
   * Get model accuracy statistics
   */
  async getAccuracyStats(params?: {
    sport?: string;
    prediction_type?: string;
    date_range?: string;
  }): Promise<AccuracyStats> {
    const { data } = await apiClient.get<{ data: AccuracyStats }>(
      '/v1/accuracy',
      { params }
    );
    return data.data;
  },

  /**
   * Get calibration data for a sport/type
   */
  async getCalibration(sport?: string): Promise<CalibrationData[]> {
    const { data } = await apiClient.get<{ data: CalibrationData[] }>(
      '/v1/accuracy/calibration',
      { params: { sport } }
    );
    return data.data;
  },
};

interface CalibrationData {
  confidence_bucket: string;
  predicted_prob: number;
  actual_rate: number;
  sample_size: number;
}
