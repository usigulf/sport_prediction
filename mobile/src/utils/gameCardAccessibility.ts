import type { Game } from '../types';
import { formatLeagueLabel } from './leagueDisplay';

function formatScheduledTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusPhrase(game: Game): string {
  const status = game.status;
  if (status === 'live') {
    const home = game.home_score ?? 0;
    const away = game.away_score ?? 0;
    return `Live. Score ${home} to ${away}.`;
  }
  if (status === 'finished') {
    const home = game.home_score ?? 0;
    const away = game.away_score ?? 0;
    return `Finished. Final score ${home} to ${away}.`;
  }
  return `Scheduled for ${formatScheduledTime(game.scheduled_time)}.`;
}

/** Single VoiceOver label summarizing matchup, status, and prediction availability. */
export function buildGameCardAccessibilityLabel(game: Game): string {
  const league = formatLeagueLabel(game.league);
  const home = game.home_team?.name || 'Home team';
  const away = game.away_team?.name || 'Away team';
  const parts = [`${league}.`, `${home} versus ${away}.`, statusPhrase(game)];
  if (game.prediction) {
    parts.push('AI prediction available.');
  }
  return parts.join(' ');
}
