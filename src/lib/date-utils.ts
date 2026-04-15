/**
 * TGS Date Utilities
 * Ensures consistent 'Ground Truth' timing regardless of where a user is logging in from.
 */

const TIMEZONE = 'America/New_York';

/**
 * Returns today's date string in YYYY-MM-DD format based on Eastern Time
 */
export function getCompanyToday(): string {
  const d = new Date();
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA gives YYYY-MM-DD
}

/**
 * Returns the current month string in YYYY-MM format based on Eastern Time
 */
export function getCompanyCurrentMonth(): string {
  return getCompanyToday().substring(0, 7);
}

/**
 * Returns the ISO string for the start of the current month based on Eastern Time
 */
export function getCompanyMonthStartISO(): string {
  return `${getCompanyCurrentMonth()}-01T00:00:00.000Z`;
}

/**
 * Safely parse a date string into a display date without timezone shifts
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  // Append noon time to prevent 'prev-day' shifts during parsing
  const d = new Date(`${dateStr.split('T')[0]}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
