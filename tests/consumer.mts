import {
  addBusinessMinutes,
  isBusinessInstant,
  type BusinessCalendar,
} from '@lp-labs/business-calendar';
const calendar: BusinessCalendar = {
  intervals: [{ weekday: 1, startMinute: 540, endMinute: 1020 }],
};
const next: Date = addBusinessMinutes('2026-11-02T09:00:00Z', 30, calendar);
const open: boolean = isBusinessInstant(next, calendar);
void open;
