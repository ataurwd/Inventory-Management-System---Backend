/**
 * Date utility functions for expiry management.
 */

/**
 * Calculate the number of days until a given expiry date.
 * Returns a negative number if the date is already past.
 */
export function daysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is expiring within the given threshold.
 * @param expiryDate - The expiry date to check
 * @param thresholdDays - Number of days threshold (default 15)
 * @returns true if the item expires within the threshold (and hasn't already expired)
 */
export function isExpiringSoon(expiryDate: Date, thresholdDays: number = 15): boolean {
  const days = daysUntilExpiry(expiryDate);
  return days >= 0 && days <= thresholdDays;
}

/**
 * Check if a batch has already expired.
 */
export function isExpired(expiryDate: Date): boolean {
  return daysUntilExpiry(expiryDate) < 0;
}
