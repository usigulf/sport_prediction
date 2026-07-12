import { buildGameCardAccessibilityLabel } from './gameCardAccessibility';
import type { Game } from '../types';

function baseGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    league: 'premier_league',
    status: 'scheduled',
    scheduled_time: '2026-07-12T18:00:00.000Z',
    home_team: { id: 'h', name: 'Arsenal' },
    away_team: { id: 'a', name: 'Chelsea' },
    ...overrides,
  } as Game;
}

describe('buildGameCardAccessibilityLabel', () => {
  it('summarizes scheduled matchup', () => {
    const label = buildGameCardAccessibilityLabel(baseGame());
    expect(label).toContain('Arsenal versus Chelsea');
    expect(label.toLowerCase()).toContain('scheduled');
  });

  it('includes live score and prediction availability', () => {
    const label = buildGameCardAccessibilityLabel(
      baseGame({
        status: 'live',
        home_score: 1,
        away_score: 0,
        prediction: { id: 'p1' } as Game['prediction'],
      }),
    );
    expect(label).toContain('Live');
    expect(label).toContain('1 to 0');
    expect(label).toContain('AI prediction available');
  });
});
