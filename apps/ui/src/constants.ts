export const APP_NAME = 'Lens';

/** Convert a string to a URL-safe slug for use in element IDs. */
export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
