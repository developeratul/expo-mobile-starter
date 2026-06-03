export function localDateToUtcTimestamp(localDate: string, timezone: string) {
  const { year, month, day } = parseLocalDate(localDate);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const timezoneOffset = getTimezoneOffset(utcMidnight, timezone);
  const timestamp = utcMidnight - timezoneOffset;
  const correctedOffset = getTimezoneOffset(timestamp, timezone);

  return utcMidnight - correctedOffset;
}

export function addDaysToLocalDate(localDate: string, days: number) {
  const { year, month, day } = parseLocalDate(localDate);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getTimezoneOffset(timestamp: number, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    ) - timestamp
  );
}

// ─── MONTH KEY UTILITIES ──────────────────────────────────────────────────────
// A "month key" is a string in "YYYY-MM" format used as the primary key for
// monthly budget data. String comparison works correctly for ordering.

export function getCurrentMonthKey(): string {
  const now = new Date();
  return formatMonthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

export function getMonthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 2));
  return formatMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function getNextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month));
  return formatMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function isMonthKeyBefore(a: string, b: string): boolean {
  return a < b;
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseLocalDate(localDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (match === null) {
    throw new Error("Expected local date in YYYY-MM-DD format");
  }

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}
