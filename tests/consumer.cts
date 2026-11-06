import { addBusinessMinutes, type UtcWorkingInterval } from '@lp-labs/business-calendar';
const hours: UtcWorkingInterval[] = [{ weekday: 1, startMinute: 0, endMinute: 60 }];
const next: Date = addBusinessMinutes(0, 1, { intervals: hours });
void next;
