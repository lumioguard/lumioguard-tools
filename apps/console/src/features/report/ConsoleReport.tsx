import { ReadingTier, consolidatedScore, readingBandFor } from '@lumioguard/shared';
import { NextSteps, Panel, PanelGrid, ReadingState, Verdict } from '@lumioguard/ui';
import type { EventProperties } from '@lumioguard/web-core';
import { useState } from 'react';
import { VERDICT_SCALE } from '../../theme/reading.js';
import type { ToolDescriptor } from '../../tools/registry.js';
import { type Reading, useReadings } from '../scan/useReadings.js';
import { Culprits } from './Culprits.js';
import { FailedReadings, FailureList } from './FailedReadings.js';
import { PageList } from './PageList.js';
import { PageLists } from './PageLists.js';
import { ReadingSection } from './ReadingSection.js';
import { SiteShot } from './SiteShot.js';
import { useReportView } from './useReportView.js';

const HANDOFF_OFFER =
  "This is what's visible to the public. Log in to perform code level check for free.";

/**
 * The verdict panel is mounted once and stays mounted across the wait, so the
 * needle hunts and then closes rather than one component animating and a second
 * appearing finished. Sections appear as their own tool lands.
 */
export function ConsoleReport({
  address,
  tools,
  pageName,
  onNewSite,
}: {
  readonly address: string;
  readonly tools: readonly ToolDescriptor[];
  /** Which document this report is being read on, for the events it sends. */
  readonly pageName: string;
  readonly onNewSite: () => void;
}): JSX.Element {
  const { readings, isReading } = useReadings(address, tools);
  const [showPages, setShowPages] = useState(false);

  const landed = readings.filter(
    (reading): reading is Reading & { outcome: NonNullable<Reading['outcome']> } =>
      reading.outcome !== null,
  );
  const score = consolidatedScore(landed.map((reading) => reading.outcome.score));
  // The LOWEST score: higher is better, so the worst reading is the smallest.
  const worst = landed.reduce<(typeof landed)[number] | null>(
    (found, reading) =>
      found === null || reading.outcome.score < found.outcome.score ? reading : found,
    null,
  );

  // The worst reading's key FIRST: the hand-off carries them all, and a far side
  // taking only the first should get the reading that produced the verdict.
  const siteKeys = [
    ...(worst === null ? [] : [worst.outcome.siteKey]),
    ...landed.filter((reading) => reading !== worst).map((reading) => reading.outcome.siteKey),
  ];

  const everyOneFailed = readings.length > 0 && !isReading && landed.length === 0;

  // One tool speaks in its own words; several compare only on the shared ladder.
  // Scale and tier both read `sole`, so the band drawn is a band OF the ladder
  // drawn: decided apart, a single-tool read stamped Clean on a scale with none.
  const sole = tools.length === 1 ? (tools[0] ?? null) : null;
  const scale = sole === null ? VERDICT_SCALE : sole.scale;
  const soleTier = sole === null ? null : (landed[0]?.outcome.tier ?? null);
  const tier =
    soleTier ??
    (landed.length === 0
      ? (scale.bands.at(-1)?.tier ?? ReadingTier.Clean)
      : readingBandFor(score).tier);

  // ONE object rather than a bag written out at each call: a property added to the
  // hand-off and not the report leaves the rate measured between them wrong.
  const readingContext: EventProperties = {
    tool_page: pageName,
    tools: landed.map((reading) => reading.tool.id).join(','),
    score,
    tier,
    worst_tool: worst?.tool.id ?? null,
  };

  useReportView(!isReading && landed.length > 0, {
    ...readingContext,
    failed_count: readings.length - landed.length,
  });

  // Nothing read means NO VERDICT, not a clean one. Drawn whatever happened, the
  // seal stamped CLEAN in green over a site that had refused every request.
  if (everyOneFailed) {
    return (
      <PanelGrid fills>
        <Panel hand="c" red span={12}>
          <p className="pen-title">Nothing could be read</p>
          <p role="alert" className="mt-3 max-w-[62ch] text-body text-ink-2">
            Every reading of {address} failed, so there is no verdict to give.
          </p>
          <FailureList readings={readings} className="mt-4" />
          <button
            type="button"
            onClick={onNewSite}
            className="mt-6 self-start rounded-drawn-chip border-2 border-pen-700 bg-transparent px-[22px] py-[13px] font-sans text-15 font-medium text-ink-1 transition-colors hover:border-pen-600 hover:bg-paper-high"
          >
            Try another site
          </button>
        </Panel>
      </PanelGrid>
    );
  }

  // The page list REPLACES the report rather than expanding inside it: unfolded in
  // place it pushed everything below off screen with no way back.
  if (showPages) {
    return (
      <PanelGrid>
        <PageList readings={readings} onBack={() => setShowPages(false)} />
      </PanelGrid>
    );
  }

  return (
    <PanelGrid>
      <Verdict
        scale={scale}
        subject={address}
        score={score}
        tier={tier}
        waiting={isReading ? <ReadingState /> : undefined}
        onNewSite={onNewSite}
        actions={
          landed.length === 0 ? undefined : (
            <NextSteps
              offer={HANDOFF_OFFER}
              siteKey={siteKeys}
              // One tool's report names itself; a run of several is a full audit.
              from={tools.length === 1 ? (tools[0]?.id ?? null) : null}
              context={{ ...readingContext, cta_location: 'report_verdict' }}
            />
          )
        }
      />

      {!isReading && landed.length > 0 && <FailedReadings readings={readings} />}

      {/* Mounted from the first frame. Held back until the last tool landed, both
          arrived after the wait they exist to fill. */}
      <SiteShot address={address} resolving={isReading} />
      <Culprits readings={readings} pending={isReading} />

      {landed.map((reading) => (
        <ReadingSection key={reading.tool.id} outcome={reading.outcome} />
      ))}

      <PageLists readings={readings} onOpen={() => setShowPages(true)} />
    </PanelGrid>
  );
}
