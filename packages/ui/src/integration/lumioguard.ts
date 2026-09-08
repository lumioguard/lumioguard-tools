/**
 * OPTIONAL and OFF unless configured. ONE flag governs every mention: the hand-off,
 * the wordmark and the colophon credit. A fork that sets nothing never says the
 * word, and there is no address here to fall back to.
 */
export function auditOrigin(configured: string | undefined): string | null {
  const trimmed = configured?.trim();
  return trimmed ? trimmed.replace(/\/$/, '') : null;
}

export const AUDIT_ORIGIN = auditOrigin(import.meta.env.VITE_LUMIOGUARD_APP_URL);

export const LUMIOGUARD_ENABLED = AUDIT_ORIGIN !== null;

/**
 * Where the WORDMARK points, which is not the hand-off's app: a credit belongs on
 * the page saying what LumioGuard is, not behind a sign-in. Governed by the one
 * switch, and falls back to the app when unset rather than an address written here.
 */
export const PARENT_SITE = auditOrigin(import.meta.env.VITE_LUMIOGUARD_SITE_URL);

/**
 * Both the wordmark and the colophon's legal row read THIS: the row read
 * `PARENT_SITE` directly once, and a deployment setting only the app URL got a
 * wordmark and no Terms link.
 */
export function parentSiteHref(appUrl: string | null, siteUrl: string | null): string | null {
  return appUrl === null ? null : (siteUrl ?? appUrl);
}

export function parentHref(): string | null {
  return parentSiteHref(AUDIT_ORIGIN, PARENT_SITE);
}

/**
 * Every key JOINED, never a repeated parameter: the app parses its search with zod
 * where `sitekey` is a string, so `?sitekey=A&sitekey=B` arrived as an ARRAY and
 * threw before any route matched. `_` is outside the key alphabet, so it splits one way.
 */
const KEY_JOINER = '_';

/**
 * Never a sign-in path: that route has moved and every visitor landed on a 404. Keys
 * come from the readings, never derived from the address, or everyone who scanned a
 * host reaches one stranger's verdict. ORDER IS MEANING: the verdict's key leads.
 *
 * `from` names the tool the visitor is leaving, when the report is one tool's: the
 * app leads with that reading and files the rest as other findings. A console that
 * ran several tools names none, and the app shows them side by side.
 */
export function fullAuditUrl(
  siteKeys: string | null | readonly (string | null)[],
  from: string | null = null,
): string | null {
  if (AUDIT_ORIGIN === null) return null;
  const url = new URL('/', AUDIT_ORIGIN);
  const keys = (Array.isArray(siteKeys) ? siteKeys : [siteKeys]).filter(
    (key): key is string => typeof key === 'string' && key !== '',
  );
  if (keys.length > 0) url.searchParams.set('sitekey', keys.join(KEY_JOINER));
  if (from) url.searchParams.set('from', from);
  return url.toString();
}
