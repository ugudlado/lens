export const APP_NAME = "Lens";
export const APP_VERSION: string = __APP_VERSION__;

/** Convert a string to a URL-safe slug for use in element IDs. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
