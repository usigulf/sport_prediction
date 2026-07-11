import {
  buildSoccerWeekDays,
  buildSundayWeekDays,
  formatLocalYMD,
  mondayBasedIndexInWeek,
  sundayBasedIndexInWeek,
  weekRangeLabel,
} from './sportsWeek';

describe('sportsWeek', () => {
  const wed = new Date(2026, 6, 8, 12, 0, 0); // Wed Jul 8 2026 local

  it('formats local YMD', () => {
    expect(formatLocalYMD(wed)).toBe('2026-07-08');
  });

  it('builds Monday-start soccer week', () => {
    const days = buildSoccerWeekDays(0, wed);
    expect(days).toHaveLength(7);
    expect(days[0].weekdayShort).toBe('Mon');
    expect(days[0].ymd).toBe('2026-07-06');
    expect(days[2].isToday).toBe(true);
  });

  it('builds Sunday-start NFL/NBA week', () => {
    const days = buildSundayWeekDays(0, wed);
    expect(days).toHaveLength(7);
    expect(days[0].weekdayShort).toBe('Sun');
    expect(days[0].ymd).toBe('2026-07-05');
    expect(days[3].isToday).toBe(true);
  });

  it('indexes today in week', () => {
    expect(mondayBasedIndexInWeek(wed)).toBe(2);
    expect(sundayBasedIndexInWeek(wed)).toBe(3);
  });

  it('labels week range', () => {
    expect(weekRangeLabel(buildSundayWeekDays(0, wed))).toBe('07/05 – 07/11');
  });
});
