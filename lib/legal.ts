/**
 * NWMLS / IDX disclaimer text, copied verbatim from the footer of
 * https://abigailrealtor.com on 2026-04-21 (see /content/legal/idx-disclaimer.md).
 *
 * RULE (CLAUDE.md §9.12): this text is LEGALLY REQUIRED and must be rendered
 * VERBATIM. Do not paraphrase, summarize, or "clean up" wording here — any
 * edits must come from the live source and be captured again.
 *
 * The date/time tokens below are dynamic on the live site and filled at render
 * time via `buildDisclaimerParagraphs()`.
 */

const RELIABILITY_STATEMENT =
  'All information is deemed reliable but not guaranteed and should be independently reviewed and verified.'

const IDX_PARAGRAPH =
  'The IDX display contains information sourced from the Northwest Multiple Listing Service. This data is intended solely for personal, non-commercial use and is not to be utilized for any other purposes except to identify potential properties for purchase. Although the MLS data displayed is typically considered reliable, it is not guaranteed to be accurate by the MLS. Buyers are responsible for verifying the accuracy of all information and are advised to conduct their own investigations or seek professional assistance. Other sources besides the Listing Agent may have contributed to the MLS data presented. Unless expressly specified in writing, the Broker/Agent has not confirmed any information obtained from external sources. The Broker/Agent may or may not have acted as the Listing and/or Selling Agent and cannot guarantee the accuracy of property locations displayed on any map. Any compensation offers are solely made to participants of the MLS where the listing is registered.'

const MLS_GRID_PARAGRAPH_TEMPLATE =
  'The IDX display presents information sourced from the Northwest Multiple Listing Service as of {{DATE}}. The data is intended for personal, non-commercial use and should not be used for any other purpose except to identify potential properties for purchase. While the MLS data displayed is generally deemed reliable, it is NOT guaranteed to be accurate by the MLS. Buyers are responsible for verifying the accuracy of all information and are advised to conduct their own investigations or seek professional assistance. Other sources besides the Listing Agent may have contributed to the MLS data presented. Unless expressly specified in writing, the Broker/Agent has not confirmed any information obtained from external sources. The Broker/Agent, may or may not have acted as the Listing and/or Selling Agent and cannot guarantee the accuracy of property locations displayed on any map. The property locations displayed on any map are merely best approximations and exact locations should be independently verified. Based on information submitted to the MLS GRID as of {{DATE}} at {{TIME_UTC}} . All data is obtained from various sources and may not have been verified by broker or MLS GRID. Supplied Open House Information is subject to change without notice. All information should be independently reviewed and verified for accuracy. Properties may or may not be listed by the office/agent presenting the information.'

function formatDate(d: Date): string {
  // Matches the live site's `M/D/YYYY` format (e.g. "4/21/2026").
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`
}

function formatTimeUtc(d: Date): string {
  // Matches the live site's `H:MM AM/PM UTC` format (e.g. "10:32 AM UTC").
  const h24 = d.getUTCHours()
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const ampm = h24 < 12 ? 'AM' : 'PM'
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h12}:${mm} ${ampm} UTC`
}

export type DisclaimerParagraphs = {
  reliability: string
  idx: string
  mlsGrid: string
  copyright: string
  brokerage: string
}

export function buildDisclaimerParagraphs(now: Date = new Date()): DisclaimerParagraphs {
  const date = formatDate(now)
  const time = formatTimeUtc(now)
  return {
    reliability: RELIABILITY_STATEMENT,
    idx: IDX_PARAGRAPH,
    mlsGrid: MLS_GRID_PARAGRAPH_TEMPLATE
      .replaceAll('{{DATE}}', date)
      .replaceAll('{{TIME_UTC}}', time),
    copyright: `©${now.getUTCFullYear()} Northwest Multiple Listing Service all rights reserved.`,
    brokerage: 'John L. Scott Real Estate',
  }
}
