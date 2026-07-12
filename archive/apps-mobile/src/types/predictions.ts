export type Sport = 'nba' | 'nfl' | 'mlb' | 'nhl' | 'ncaab' | 'ncaaf' | 'soccer';

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl?: string;
  record?: string;
}

export interface SpreadPrediction {
  pick: 'home' | 'away';
  spread: number;
  confidence: number;
  fairSpread: number;
  edge: number;
}

export interface TotalPrediction {
  pick: 'over' | 'under';
  line: number;
  confidence: number;
  projectedTotal: number;
  edge: number;
}

export interface MoneylinePrediction {
  pick: 'home' | 'away';
  winProbability: number;
  impliedOdds: number;
  edge: number;
}

export interface PredictionExplanation {
  factor: string;
  value: number;
  impact: number;
  direction: 'positive' | 'negative';
  description: string;
}

export interface GamePrediction {
  id: string;
  gameId: string;
  sport: Sport;
  startTime: string;
  status: 'scheduled' | 'live' | 'final';
  homeTeam: Team;
  awayTeam: Team;
  venue?: string;
  predictions: {
    spread: SpreadPrediction;
    total: TotalPrediction;
    moneyline: MoneylinePrediction;
  };
  explanations?: PredictionExplanation[];
  updatedAt: string;
}

export interface LiveScore {
  home: number;
  away: number;
  quarter?: number;
  period?: string;
  clock?: string;
}

export interface MomentumFactor {
  description: string;
  impact: number;
}

export interface LivePrediction {
  gameId: string;
  currentScore: LiveScore;
  winProbability: {
    home: number;
    away: number;
  };
  liveSpread: {
    line: number;
    modelFairLine: number;
    edge: number;
  };
  momentum: {
    team: 'home' | 'away' | 'neutral';
    score: number;
    factors: MomentumFactor[];
  };
  lastUpdated: string;
}

export type PropType = 'points' | 'rebounds' | 'assists' | 'threes' | 'steals' | 'blocks' |
  'passing_yards' | 'rushing_yards' | 'receiving_yards' | 'touchdowns' |
  'hits' | 'runs' | 'rbis' | 'strikeouts';

export interface PropPrediction {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  playerTeam: string;
  propType: PropType;
  line: number;
  pick: 'over' | 'under';
  confidence: number;
  projectedValue: number;
  edge: number;
}

export interface ScenarioCondition {
  type: 'player_status' | 'weather' | 'time_weight' | 'custom';
  key: string;
  value: string | number | boolean;
  label: string;
}

export interface ScenarioRequest {
  conditions: ScenarioCondition[];
}

export interface ScenarioResult {
  originalPrediction: SpreadPrediction;
  adjustedPrediction: SpreadPrediction;
  delta: number;
  conditionImpacts: {
    condition: string;
    impact: number;
  }[];
}

export interface AccuracyStats {
  overall: {
    winRate: number;
    totalPicks: number;
    roi: number;
  };
  bySport: {
    sport: Sport;
    winRate: number;
    totalPicks: number;
    roi: number;
  }[];
  byPredictionType: {
    type: 'spread' | 'total' | 'moneyline';
    winRate: number;
    totalPicks: number;
  }[];
  byConfidence: {
    bucket: string;
    predictedRate: number;
    actualRate: number;
    sampleSize: number;
  }[];
  last7Days: {
    date: string;
    wins: number;
    losses: number;
    pushes: number;
  }[];
}
