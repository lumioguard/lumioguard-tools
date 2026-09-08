import {
  AnalyticsEvent,
  type EventProperties,
  useAnalytics,
  withoutQuery,
} from '@lumioguard/web-core';
import { fullAuditUrl } from '../integration/lumioguard.js';

/**
 * In two halves because the brand is SET lowercase, never typed that way. The click
 * reports these words, so a drifted label is a number about a button nobody sees.
 */
const LABEL_VERB = 'Log in to';
const LABEL_BRAND = 'LumioGuard';

/** Renders NOTHING when the LumioGuard integration is not configured. */
export function NextSteps({
  siteKey,
  from = null,
  offer,
  context,
}: {
  readonly siteKey: string | null | readonly (string | null)[];
  /** The tool this report belongs to, when it is one tool's. The app leads with it. */
  readonly from?: string | null;
  /** What the hand-off is worth, in this tool's own words. */
  readonly offer: string;
  /** What the page around it knows, sent with the click. Never an address. */
  readonly context?: EventProperties;
}): JSX.Element | null {
  const analytics = useAnalytics();
  const href = fullAuditUrl(siteKey, from);
  if (href === null) return null;

  return (
    <div className="mt-7 flex flex-col gap-y-5 sm:flex-row sm:items-center sm:gap-x-10">
      {/* The offer outranks the button: as a grey line under it, a scanning eye took
          the chip and never learned what for. */}
      <div className="min-w-0 flex-1">
        <p className="m-0 max-w-[34ch] font-sans text-18 font-semibold leading-[1.35] text-ink-1 lg:text-20">
          {offer}
        </p>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        onClick={() =>
          analytics.capture(AnalyticsEvent.CtaClick, {
            cta_text: `${LABEL_VERB} ${LABEL_BRAND}`,
            cta_href: withoutQuery(href),
            ...context,
          })
        }
        className="inline-flex shrink-0 items-center gap-[10px] self-start rounded-drawn-chip border-2 border-pen-300 bg-pen-400 px-5 py-[13px] font-sans text-16 font-semibold text-paper-raised no-underline transition-colors hover:bg-pen-300 sm:self-auto sm:px-6 lg:px-7 lg:py-[15px] lg:text-17"
      >
        {/* SET lowercase, never typed: the document keeps the real name, so a copy
            or a bookmark still spells it properly. */}
        {LABEL_VERB} <span className="lowercase">{LABEL_BRAND}</span>
        <svg
          viewBox="0 0 22 15"
          className="h-[15px] w-[22px] fill-none stroke-current"
          aria-hidden="true"
          strokeWidth={1.8}
          strokeLinecap="round"
        >
          <path d="M1 7.6c6-.6 12.6-.8 19.1-.4M15 2.4c1.9 1.8 3.7 3.6 5.5 5.4-1.8 1.9-3.6 3.7-5.6 5.4" />
        </svg>
      </a>
    </div>
  );
}
