export interface UtcWorkingInterval {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface BusinessCalendar {
  intervals: readonly UtcWorkingInterval[];
  holidays?: readonly string[];
  maxDays?: number;
}

type InstantInput = Date | string | number;

const DAY_MS = 86_400_000;
const MAX_DATE_MS = 8_640_000_000_000_000;

function startOfUtcDay(timestamp: number): number {
  return Math.floor(timestamp / DAY_MS) * DAY_MS;
}

function asDate(timestamp: number): Date {
  if (!Number.isSafeInteger(timestamp) || Math.abs(timestamp) > MAX_DATE_MS) {
    throw new RangeError('Calculated instant is outside the supported Date range.');
  }
  return new Date(timestamp);
}

function instant(value: InstantInput): number {
  if (value instanceof Date) {
    const time = value.getTime();
    if (!Number.isFinite(time)) throw new TypeError('Start must be a valid instant.');
    return time;
  }
  if (typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= MAX_DATE_MS) {
    return value;
  }
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  ) {
    const time = Date.parse(value);
    if (Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value.slice(0, 10)) {
      return time;
    }
  }
  throw new TypeError(
    'Instants must be valid Date values, integer milliseconds, or UTC strings ending in Z.',
  );
}

function calendarData(calendar: BusinessCalendar) {
  if (!calendar || typeof calendar !== 'object' || !Array.isArray(calendar.intervals)) {
    throw new TypeError('Calendar intervals must be an array.');
  }
  if (calendar.intervals.length > 1000)
    throw new RangeError('At most 1000 intervals are supported.');
  const intervals = calendar.intervals.map((interval) => {
    if (
      !Number.isInteger(interval.weekday) ||
      interval.weekday < 0 ||
      interval.weekday > 6 ||
      !Number.isInteger(interval.startMinute) ||
      !Number.isInteger(interval.endMinute) ||
      interval.startMinute < 0 ||
      interval.startMinute >= interval.endMinute ||
      interval.endMinute > 1440
    ) {
      throw new RangeError('Intervals need weekday 0..6 and 0 <= startMinute < endMinute <= 1440.');
    }
    return { ...interval };
  });
  intervals.sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  for (let index = 1; index < intervals.length; index += 1) {
    const previous = intervals[index - 1]!;
    const current = intervals[index]!;
    if (previous.weekday === current.weekday && current.startMinute < previous.endMinute) {
      throw new RangeError('Working intervals on the same weekday may not overlap.');
    }
  }
  const byWeekday = new Map<number, UtcWorkingInterval[]>();
  for (const interval of intervals) {
    const weekdayIntervals = byWeekday.get(interval.weekday) ?? [];
    weekdayIntervals.push(interval);
    byWeekday.set(interval.weekday, weekdayIntervals);
  }
  const holidays = new Set<string>();
  if (calendar.holidays !== undefined) {
    if (!Array.isArray(calendar.holidays) || calendar.holidays.length > 100_000) {
      throw new RangeError('Holidays must be an array containing at most 100000 dates.');
    }
    for (const holiday of calendar.holidays) {
      if (typeof holiday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(holiday)) {
        throw new TypeError('Holidays must use YYYY-MM-DD UTC dates.');
      }
      const parsed = new Date(`${holiday}T00:00:00.000Z`);
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== holiday) {
        throw new TypeError(`Invalid holiday date: ${holiday}`);
      }
      holidays.add(holiday);
    }
  }
  const maxDays = calendar.maxDays ?? 36_600;
  if (!Number.isSafeInteger(maxDays) || maxDays < 1 || maxDays > 1_000_000) {
    throw new RangeError('maxDays must be an integer from 1 to 1000000.');
  }
  return { intervals, byWeekday, holidays, maxDays };
}

function intervalsForDay(
  timestamp: number,
  byWeekday: ReadonlyMap<number, readonly UtcWorkingInterval[]>,
  holidays: ReadonlySet<string>,
): readonly UtcWorkingInterval[] {
  const date = new Date(timestamp);
  if (holidays.has(date.toISOString().slice(0, 10))) return [];
  return byWeekday.get(date.getUTCDay()) ?? [];
}

export function isBusinessInstant(value: InstantInput, calendar: BusinessCalendar): boolean {
  const timestamp = instant(value);
  const { byWeekday, holidays } = calendarData(calendar);
  const dayStart = startOfUtcDay(timestamp);
  const minute = (timestamp - dayStart) / 60_000;
  return intervalsForDay(timestamp, byWeekday, holidays).some(
    (interval) => minute >= interval.startMinute && minute < interval.endMinute,
  );
}

export function addBusinessMinutes(
  start: InstantInput,
  minutes: number,
  calendar: BusinessCalendar,
): Date {
  const timestamp = instant(start);
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    throw new RangeError('Business minutes must be a non-negative safe integer.');
  }
  const data = calendarData(calendar);
  if (minutes === 0) return asDate(timestamp);
  if (data.intervals.length === 0)
    throw new RangeError('Cannot add time to a calendar with no intervals.');
  let remaining = minutes * 60_000;
  if (!Number.isSafeInteger(remaining))
    throw new RangeError('Requested duration exceeds safe millisecond range.');
  let cursor = timestamp;

  for (let day = 0; day < data.maxDays; day += 1) {
    const dayStart = startOfUtcDay(cursor);
    const dayEnd = dayStart + DAY_MS;
    for (const interval of intervalsForDay(cursor, data.byWeekday, data.holidays)) {
      const intervalStart = dayStart + interval.startMinute * 60_000;
      const intervalEnd = dayStart + interval.endMinute * 60_000;
      if (cursor >= intervalEnd) continue;
      cursor = Math.max(cursor, intervalStart);
      const available = intervalEnd - cursor;
      if (remaining <= available) return asDate(cursor + remaining);
      remaining -= available;
      cursor = intervalEnd;
    }
    cursor = dayEnd;
  }
  throw new RangeError(`No sufficient working time found within ${data.maxDays} UTC days.`);
}
