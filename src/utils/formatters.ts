/**
 * MPVP — Utility Formatters
 * PII masking, date formatting, currency formatting.
 * §14 Rule 7: CNIC and phone masking is a security requirement.
 */

/**
 * Mask CNIC number for display.
 * Shows only last digit: ****-****-X
 * @param cnic - Raw 13-digit CNIC string (with or without dashes)
 */
export function maskCnic(cnic: string): string {
  if (!cnic) return '****-****-*';
  const digits = cnic.replace(/[^0-9]/g, '');
  if (digits.length !== 13) return '****-****-*';
  return '****-****-' + digits[12];
}

/**
 * Mask phone number for display.
 * Shows last 4 digits: +92-***-***-XXXX
 * @param phone - Full phone number
 */
export function maskPhone(phone: string): string {
  if (!phone) return '***-****';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 4) return '***-****';
  const last4 = digits.slice(-4);
  return `+92-***-***-${last4}`;
}

/**
 * Format ISO date string to display format.
 * @param isoDate - ISO date string (YYYY-MM-DD or full ISO)
 * @returns Formatted date like "25 Feb 2026"
 */
export function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return '—';
  }
}

/**
 * Format a timestamp as relative time.
 * @param isoDate - ISO timestamp
 * @returns String like "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(isoDate: string): string {
  try {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoDate);
  } catch {
    return '—';
  }
}

/**
 * Format currency for Pakistani Rupee (PKR).
 * @param amount - Amount string or number
 * @returns Formatted like "PKR 15,000,000"
 */
export function formatCurrency(amount: string | number): string {
  if (typeof amount === 'string') return amount; // Already formatted from API
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

/**
 * Format GPS coordinates for display.
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted like "24.8607° N, 67.0104° E"
 */
export function formatGPS(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Format countdown timer as MM:SS.
 * @param totalSeconds - Remaining seconds
 */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
