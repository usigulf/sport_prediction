/** Strip vendor names from licensed-feed copy (legacy API responses). */
export function sanitizeLicensedFeedCopy(text: string): string {
  return text
    .replace(/Sportradar\s+/gi, '')
    .replace(/live provider snapshot/gi, 'licensed feed snapshot')
    .replace(/subject to Sportradar TTL/gi, 'refreshed on a provider schedule');
}
