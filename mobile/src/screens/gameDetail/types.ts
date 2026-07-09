export interface PlayerPropItem {
  player_name: string;
  team: string;
  prop_type: string;
  predicted_value: number;
  line: number;
  unit: string;
  confidence_level?: string;
  source?: 'spotlight' | 'team_estimate';
}
