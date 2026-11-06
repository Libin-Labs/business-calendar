# @lp-labs/business-calendar

Add business minutes using explicit UTC weekly intervals and date-based holidays. The package has
no timezone database, runtime or peer dependencies; it never consults the host's local timezone.
ESM, CommonJS and TypeScript declarations are included.

## Install

```sh
npm install @lp-labs/business-calendar
```

Requires Node.js 18+ or an ESM-aware bundler. CommonJS:
`const { addBusinessMinutes, isBusinessInstant } = require('@lp-labs/business-calendar')`.

## Quickstart

```js
import { addBusinessMinutes, isBusinessInstant } from '@lp-labs/business-calendar';

const calendar = {
  intervals: [
    { weekday: 1, startMinute: 540, endMinute: 1020 },
    { weekday: 2, startMinute: 540, endMinute: 1020 },
    { weekday: 3, startMinute: 540, endMinute: 1020 },
    { weekday: 4, startMinute: 540, endMinute: 1020 },
    { weekday: 5, startMinute: 540, endMinute: 1020 },
  ],
  holidays: ['2026-12-25'],
};
const deadline = addBusinessMinutes('2026-11-02T16:30:00Z', 120, calendar);
console.log(deadline.toISOString()); // 2026-11-03T10:30:00.000Z
console.log(isBusinessInstant(deadline, calendar)); // true
```

## Public API

Runtime exports: `addBusinessMinutes(start, minutes, calendar): Date` and
`isBusinessInstant(value, calendar): boolean`.

Type exports: `UtcWorkingInterval`, `BusinessCalendar`.

Weekdays use UTC numbering (Sunday `0` through Saturday `6`). Each interval is a half-open range
`[startMinute, endMinute)` within its UTC weekday, with minutes from midnight and end at most 1440. Same-day intervals may touch but may not overlap. Holidays use strict `YYYY-MM-DD` UTC
dates and suppress every interval on that date.

Input instants are valid `Date` objects, integer Unix milliseconds, or ISO timestamps ending in
`Z`; offset timestamps and local date strings are rejected. Adding a positive duration begins at
the supplied instant if working time is open, otherwise at the next interval. The opening boundary
is included and closing boundary excluded. A zero-minute addition returns the same instant without
snapping. Durations are non-negative integer minutes. Search is bounded by `maxDays` (default
36,600 days); exhaustion throws. `isBusinessInstant` uses those same explicit boundaries.

## Customization and limits

Provide the applicable UTC intervals, holiday dates and any jurisdiction-specific calendar rules
yourself. If your business operates in a named timezone, resolve local wall-clock schedules and
daylight-saving transitions with your chosen timezone-data adapter before constructing UTC
intervals; this package has no TZ database and cannot infer those transitions. Split overnight
work into intervals on each UTC day. Maximums are 1,000 intervals, 100,000 holidays and 1,000,000
search days.

No business-day convention, holiday feed, daylight-saving policy, timezone conversion, recurring
holiday logic or fractional-minute arithmetic is included. Invalid dates/configuration, overlapping
intervals, unsafe durations, and insufficient search horizon throw.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
