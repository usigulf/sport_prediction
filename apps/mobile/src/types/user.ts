export interface UserProfile {
  displayName?: string;
  avatarUrl?: string;
  timezone?: string;
  preferredSports?: string[];
  notificationsEnabled?: boolean;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  profile?: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlan = 'free' | 'pro' | 'elite' | 'api';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  features?: {
    allSports: boolean;
    liveUpdates: boolean;
    playerProps: boolean;
    scenarioEngine: boolean;
    apiAccess: boolean;
    maxAlerts: number;
  };
}

export interface BankrollEntry {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss';
  amount: number;
  balance: number;
  notes?: string;
  betId?: string;
}

export interface UserBet {
  id: string;
  gameId: string;
  sport: string;
  betType: 'spread' | 'total' | 'moneyline' | 'prop';
  selection: string;
  odds: number;
  stake: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost' | 'push' | 'void';
  result?: number;
  createdAt: string;
  settledAt?: string;
}

export interface Alert {
  id: string;
  type: 'high_confidence' | 'edge_detected' | 'line_movement' | 'injury_update' | 'game_start';
  sport?: string;
  minConfidence?: number;
  minEdge?: number;
  enabled: boolean;
  channels: ('push' | 'email' | 'sms')[];
}
