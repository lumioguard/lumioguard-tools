import { describe, expect, it } from 'vitest';
import {
  AUDIT_ORIGIN,
  LUMIOGUARD_ENABLED,
  auditOrigin,
  fullAuditUrl,
  parentSiteHref,
} from '../lumioguard.js';

// Three failures this guards, all of which shipped: a hand-off pointing at a
// `/login` the other app never had, a key derived from the address so strangers
// shared one verdict, and a default that made a fork advertise a LumioGuard it lacks.
describe('auditOrigin', () => {
  // OPTIONAL by default: the tool stands alone unless an app is configured.
  it('is off when nothing is configured', () => {
    expect(auditOrigin(undefined)).toBeNull();
    expect(auditOrigin('')).toBeNull();
    expect(auditOrigin('   ')).toBeNull();
  });

  it('takes a configured origin, so a local run reaches a local app', () => {
    expect(auditOrigin('http://localhost:5173')).toBe('http://localhost:5173');
  });

  // `new URL('/', base)` tolerates it, but a concatenation would keep the slash.
  it('drops a trailing slash rather than doubling it', () => {
    expect(auditOrigin('http://localhost:5173/')).toBe('http://localhost:5173');
  });
});

// Every case below needs a configured app; with none there is no link at all.
describe.skipIf(AUDIT_ORIGIN === null)('fullAuditUrl, with an app configured', () => {
  const href = (key: string | null): URL => {
    const value = fullAuditUrl(key);
    if (value === null) throw new Error('expected a link');
    return new URL(value);
  };

  it('goes to the app front door, never to a sign-in path', () => {
    const url = href('K7M2XQ');
    expect(url.origin).toBe(new URL(AUDIT_ORIGIN ?? '').origin);
    expect(url.pathname).toBe('/');
  });

  it('carries this reading\u2019s key', () => {
    expect(href('K7M2XQ').searchParams.get('sitekey')).toBe('K7M2XQ');
  });

  // A reading that could not be recorded has no key. The link still works, and the
  // app asks for a site the ordinary way.
  it('omits the parameter entirely when there is no key', () => {
    const url = href(null);
    expect(url.searchParams.has('sitekey')).toBe(false);
    expect(url.search).toBe('');
  });

  it('takes the key it is given rather than deriving one from an address', () => {
    expect(fullAuditUrl('AAAAAA')).not.toBe(fullAuditUrl('BBBBBB'));
  });

  // ONE parameter, never repeated: `sitekey` is a string in the app's zod schema, so
  // `?sitekey=A&sitekey=B` arrived as an array and threw before any route matched.
  it('carries every key of a multi-tool reading in one parameter', () => {
    const url = new URL(fullAuditUrl(['AAAAAA', 'BBBBBB', 'CCCCCC']) ?? '');
    expect(url.searchParams.getAll('sitekey')).toEqual(['AAAAAA_BBBBBB_CCCCCC']);
  });

  // The app leads with the tool the visitor is leaving, so one tool's report names
  // itself. A console that ran several names none and the app shows them side by side.
  it('names the tool the report belongs to, and only then', () => {
    const named = new URL(fullAuditUrl('K7M2XQ', 'slopmeter') ?? '');
    expect(named.searchParams.get('from')).toBe('slopmeter');
    expect(named.searchParams.get('sitekey')).toBe('K7M2XQ');
    expect(new URL(fullAuditUrl('K7M2XQ') ?? '').searchParams.has('from')).toBe(false);
  });

  // The caller orders them, so the reading that set the verdict leads.
  it('puts the caller’s worst reading first', () => {
    const url = new URL(fullAuditUrl(['WORST1', 'BBBBBB']) ?? '');
    expect(url.searchParams.get('sitekey')).toBe('WORST1_BBBBBB');
  });

  // A tool whose recording failed contributes nothing rather than an empty slot.
  it('skips the tools that could not be recorded', () => {
    const url = new URL(fullAuditUrl([null, 'BBBBBB', null]) ?? '');
    expect(url.searchParams.getAll('sitekey')).toEqual(['BBBBBB']);
  });

  it('omits the parameter when no tool could be recorded', () => {
    expect(new URL(fullAuditUrl([null, null]) ?? '').search).toBe('');
    expect(new URL(fullAuditUrl([]) ?? '').search).toBe('');
  });
});

describe('fullAuditUrl, with no app configured', () => {
  it('answers null so the report renders no hand-off at all', () => {
    if (AUDIT_ORIGIN !== null) return;
    expect(fullAuditUrl('K7M2XQ')).toBeNull();
    expect(fullAuditUrl(null)).toBeNull();
  });
});

// Two switches for one integration is how a fork ships a tool with no button and
// the parent's name still on the masthead.
describe('LUMIOGUARD_ENABLED', () => {
  it('is the same switch the hand-off link answers to', () => {
    expect(LUMIOGUARD_ENABLED).toBe(AUDIT_ORIGIN !== null);
    expect(LUMIOGUARD_ENABLED).toBe(fullAuditUrl('K7M2XQ') !== null);
  });

  it('is off in a run that configures nothing, which is the default', () => {
    if (AUDIT_ORIGIN !== null) return;
    expect(LUMIOGUARD_ENABLED).toBe(false);
  });
});

// The wordmark and the colophon's legal links answer to ONE switch: read apart, the
// legal row vanished on a deployment setting the app URL and not the site URL.
describe('parentSiteHref', () => {
  it('is off when the integration is off, whatever the site url says', () => {
    expect(parentSiteHref(null, null)).toBeNull();
    expect(parentSiteHref(null, 'https://lumioguard.dev')).toBeNull();
  });

  it('falls back to the app when no site url is set', () => {
    expect(parentSiteHref('https://app.example.test', null)).toBe('https://app.example.test');
  });

  it('prefers the site url, which is where a credit belongs', () => {
    expect(parentSiteHref('https://app.example.test', 'https://lumioguard.dev')).toBe(
      'https://lumioguard.dev',
    );
  });
});
