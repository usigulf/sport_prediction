/**
 * Week strip helpers for sport hubs (soccer = Monday start, NFL/NBA = Sunday start).
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** YYYY-MM-DD in local calendar */
export function formatLocalYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Monday 00:00:00 local time for the week containing `d`. */
export function startOfLocalMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Sunday 00:00:00 local time for the week containing `d`. */
export function startOfLocalSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Index 0 = Monday … 6 = Sunday for the given local date's week. */
export function mondayBasedIndexInWeek(d: Date): number {
  const mon = startOfLocalMonday(d);
  const cur = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  cur.setHours(0, 0, 0, 0);
  const diffDays = Math.round((cur.getTime() - mon.getTime()) / 86400000);
  return Math.max(0, Math.min(6, diffDays));
}

/** Index 0 = Sunday … 6 = Saturday for the given local date's week. */
export function sundayBasedIndexInWeek(d: Date): number {
  const sun = startOfLocalSunday(d);
  const cur = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  cur.setHours(0, 0, 0, 0);
  const diffDays = Math.round((cur.getTime() - sun.getTime()) / 86400000);
  return Math.max(0, Math.min(6, diffDays));
}

export type WeekDay = {
  ymd: string;
  weekdayShort: string;
  dayNum: number;
  isToday: boolean;
};

export type WeekStart = 'monday' | 'sunday';

function buildWeekDays(
  weekOffset: number,
  weekStart: WeekStart,
  now: Date = new Date(),
): WeekDay[] {
  const anchor =
    weekStart === 'monday' ? startOfLocalMonday(now) : startOfLocalSunday(now);
  anchor.setDate(anchor.getDate() + weekOffset * 7);
  const todayYmd = formatLocalYMD(now);
  const weekdays =
    weekStart === 'monday'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + i);
    const ymd = formatLocalYMD(d);
    out.push({
      ymd,
      weekdayShort: weekdays[i],
      dayNum: d.getDate(),
      isToday: ymd === todayYmd,
    });
  }
  return out;
}

export function buildSoccerWeekDays(weekOffset: number, now: Date = new Date()): WeekDay[] {
  return buildWeekDays(weekOffset, 'monday', now);
}

export function buildSundayWeekDays(weekOffset: number, now: Date = new Date()): WeekDay[] {
  return buildWeekDays(weekOffset, 'sunday', now);
}

export function weekRangeLabel(days: WeekDay[]): string {
  if (!days.length) return '';
  const a = days[0].ymd.slice(5).replace('-', '/');
  const b = days[6].ymd.slice(5).replace('-', '/');
  return `${a} – ${b}`;
}

export function indexInWeekForStart(d: Date, weekStart: WeekStart): number {
  return weekStart === 'monday' ? mondayBasedIndexInWeek(d) : sundayBasedIndexInWeek(d);
}

export function buildWeekDaysForStart(
  weekOffset: number,
  weekStart: WeekStart,
  now: Date = new Date(),
): WeekDay[] {
  return weekStart === 'monday'
    ? buildSoccerWeekDays(weekOffset, now)
    : buildSundayWeekDays(weekOffset, now);
}
