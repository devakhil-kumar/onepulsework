/**
 * @file src/utils/format.js
 * @description Display formatting helpers used across the whole app.
 * Call setDisplayConfig() once (in RootNavigator) when org info loads so every
 * date/time everywhere respects the org's timezone, time format and date format.
 *
 * All timestamps are stored in UTC and shown in the ORGANISATION's timezone, so
 * every user sees the same workplace time regardless of their device's location
 * (critical for attendance & payroll).
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Module-level display config — mutated once when org loads.
let _tz      = 'Australia/Sydney';
let _timeFmt = '12h';          // '12h' | '24h'
let _dateFmt = 'DD/MM/YYYY';   // 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'D MMM YYYY'

/**
 * Apply the org's display preferences app-wide.
 * @param {{ timezone?: string, timeFormat?: string, dateFormat?: string }} cfg
 */
export function setDisplayConfig({ timezone: tz, timeFormat, dateFormat } = {}) {
  if (tz)         _tz      = tz;
  if (timeFormat) _timeFmt = timeFormat;
  if (dateFormat) _dateFmt = dateFormat;
}

export function setDisplayTimezone(tz) { if (tz) _tz = tz; }
export function getDisplayTimezone()   { return _tz; }

function timePart() { return _timeFmt === '24h' ? 'HH:mm' : 'h:mm A'; }

// ── Australian timezone offsets (self-contained — no Intl/ICU needed) ─────────
// React Native + Hermes does NOT ship IANA timezone data for Intl, so dayjs's
// .tz() silently falls back to UTC (a 9am Sydney shift showed as 11pm). We are
// AU-only, so we compute the offset (incl. DST) ourselves and format via the
// utc plugin (which works everywhere). Validated against Intl ground truth.
const AU_STD_OFFSET = {
  'Australia/Perth': 480,        // +08:00 (no DST)
  'Australia/Darwin': 570,       // +09:30 (no DST)
  'Australia/Brisbane': 600,     // +10:00 (no DST)
  'Australia/Lindeman': 600,
  'Australia/Adelaide': 570,     // +09:30 / +10:30 DST
  'Australia/Broken_Hill': 570,
  'Australia/Sydney': 600,       // +10:00 / +11:00 DST
  'Australia/Melbourne': 600,
  'Australia/Hobart': 600,
  'Australia/Canberra': 600,
};
const AU_DST_ZONES = new Set([
  'Australia/Adelaide', 'Australia/Broken_Hill', 'Australia/Sydney',
  'Australia/Melbourne', 'Australia/Hobart', 'Australia/Canberra',
]);

/** UTC ms of the first Sunday of `month` at `localHour`, given a UTC offset (min). */
function firstSundayUTCms(year, month, localHour, offsetMin) {
  const first = new Date(Date.UTC(year, month, 1));
  const add = (7 - first.getUTCDay()) % 7; // days until the first Sunday
  return Date.UTC(year, month, 1 + add, localHour, 0, 0) - offsetMin * 60000;
}

/** Is the UTC instant inside AU DST? (starts 1st Sun Oct 02:00, ends 1st Sun Apr 03:00) */
function isAuDst(t, std) {
  const y = new Date(t).getUTCFullYear();
  const octStart = firstSundayUTCms(y, 9, 2, std);
  const aprEnd = firstSundayUTCms(y, 3, 3, std + 60);
  return t < aprEnd || t >= octStart;
}

/** Offset in minutes east of UTC for an AU IANA zone at `date`, or null if unknown. */
function auOffsetMinutes(date, tz) {
  const std = AU_STD_OFFSET[tz];
  if (std == null) return null;
  let off = std;
  if (AU_DST_ZONES.has(tz) && isAuDst(new Date(date).getTime(), std)) off += 60;
  return off;
}

/** Format a UTC instant in `tz` using our AU offsets (falls back to dayjs.tz for non-AU). */
function fmtIn(date, tz, fmtStr) {
  const off = auOffsetMinutes(date, tz);
  if (off == null) return dayjs(date).tz(tz).format(fmtStr); // non-AU fallback
  return dayjs(date).utc().add(off, 'minute').format(fmtStr);
}

export function formatCurrency(amount, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

/** @param {string|Date|null|undefined} date */
export function formatDate(date) {
  if (!date) return '—';
  return fmtIn(date, _tz, _dateFmt);
}

/** @param {string|Date|null|undefined} date */
export function formatDateTime(date) {
  if (!date) return '—';
  return fmtIn(date, _tz, `${_dateFmt}, ${timePart()}`);
}

/** @param {string|Date|null|undefined} date — time only */
export function formatTime(date) {
  if (!date) return '—';
  return fmtIn(date, _tz, timePart());
}

/**
 * Format a UTC instant in a SPECIFIC timezone (e.g. a shift's own timezone),
 * falling back to the org tz. Use for shifts so a 09:00 shift reads 09:00 to
 * everyone regardless of their device timezone.
 * @param {string|Date|null|undefined} date
 * @param {string} [tz]
 * @param {boolean} [withDate=true]
 */
export function formatInTz(date, tz, withDate = true) {
  if (!date) return '—';
  const fmt = withDate ? `${_dateFmt}, ${timePart()}` : timePart();
  return fmtIn(date, tz || _tz, fmt);
}

/**
 * Convert a UTC instant to a naive wall-clock "YYYY-MM-DDTHH:mm" in `tz`,
 * for prefilling shift edit fields.
 * @param {string|Date|null|undefined} date
 * @param {string} [tz]
 */
export function toWallClockInput(date, tz) {
  if (!date) return '';
  return fmtIn(date, tz || _tz, 'YYYY-MM-DDTHH:mm');
}

/**
 * Calendar day key ("YYYY-MM-DD") for a UTC instant, computed in `tz` (falling
 * back to the org tz — SAME tz path formatInTz uses). Use to bucket shifts by day
 * so the month calendar grid and the list agree on which day a shift belongs to.
 * @param {string|Date|null|undefined} date
 * @param {string} [tz]
 */
export function toTzDayKey(date, tz) {
  if (!date) return '';
  return fmtIn(date, tz || _tz, 'YYYY-MM-DD');
}

export function formatHours(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}
