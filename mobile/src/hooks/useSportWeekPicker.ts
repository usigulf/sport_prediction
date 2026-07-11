import { useCallback, useMemo, useState } from 'react';
import {
  buildWeekDaysForStart,
  formatLocalYMD,
  indexInWeekForStart,
  type WeekDay,
  type WeekStart,
} from '../utils/sportsWeek';

export function useSportWeekPicker(weekStart: WeekStart) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayIndex, setDayIndex] = useState(() => indexInWeekForStart(new Date(), weekStart));

  const days = useMemo(
    () => buildWeekDaysForStart(weekOffset, weekStart),
    [weekOffset, weekStart],
  );

  const selectedYmd = days[dayIndex]?.ymd ?? formatLocalYMD(new Date());

  const resetToToday = useCallback(() => {
    setWeekOffset(0);
    setDayIndex(indexInWeekForStart(new Date(), weekStart));
  }, [weekStart]);

  return {
    weekOffset,
    setWeekOffset,
    dayIndex,
    setDayIndex,
    days,
    selectedYmd,
    resetToToday,
  };
}

export type SportWeekPickerState = {
  days: WeekDay[];
  dayIndex: number;
  setDayIndex: (index: number) => void;
  setWeekOffset: (updater: (w: number) => number) => void;
};
