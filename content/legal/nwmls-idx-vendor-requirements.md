<!--
Internal engineering reference — NOT rendered on the site.
Source: NWMLS Data Licensing email thread "New Vendor License Request for
John L. Scott, Inc. / Terebey Technologies LLC" (idx@nwmls.com, May 26–28 2026)
and the public MLS Grid v2 technical docs linked therein.

Captured 2026-05-28. This summarizes the binding requirements for the eventual
real-IDX swap (CLAUDE.md §7.7). The authoritative source documents are the PDFs
in ./nwmls/ and the live docs at https://docs.mlsgrid.com — re-verify against
those before implementing; this file is a working summary, not the contract.
-->

# NWMLS / MLS Grid IDX Vendor Requirements

Reference for building the real `NWMLSProvider` (`lib/idx/nwmls-provider.ts`)
and the NWMLS-required staging site. Replaces the hand-wave in CLAUDE.md §7.7
that the provider swap is "a one-line change" — see **Architectural impact**
below, it is not.

## Status (as of 2026-05-28)

Vendor application is **in progress**, not approved. NWMLS contact is
**Shelli R. Hoernlein**, Compliance Specialist II / Data Licensing Coordinator
(idx@nwmls.com, 425-820-9200).

Next action is **ours**: build a staging site running MLS Grid **Demo** data
that replicates production behavior, then "Resubmit to MLS" from the MLS Grid
account for NWMLS review. The data request has been sent back to us in MLS Grid.

Setup fee ($150 one-time, nonrefundable) appears paid — see
`./nwmls/2026052800427435_PaymentReceipt.pdf`. Ongoing cost is $40/month per
brokerage, billed to the vendor account.

## Source documents (in ./nwmls/ — local only, gitignored)

> The `./nwmls/` folder is **not committed** (sensitive docs + heavy binaries —
> see `.gitignore`). Files are kept on the maintainer's machine; this distilled
> summary is the in-repo record. Re-obtain originals from the NWMLS data-
> licensing thread or MLS Grid account if needed.


NWMLS legal/policy set (binding — read before go-live, kept verbatim):
- `DataUsePolicy_2023.pdf` — NWMLS Data Use Policy
- `MLS Grid IDX Rule 10-29-2025.pdf` — MLS Grid IDX Rules
- `Rules 27 189 190 194 196.pdf` — NWMLS Rules & Regulations 27, 189, 190, 194, 196
- `NWMLS - Data Use Compliance Policy Eff 05012024.pdf` — sanctions schedule
  (fines, feed suspension, license termination for violations / unapproved use)
- `IDX Guidance_v2_February2026.pdf` — NWMLS-specific data fields, display, procedures
- `Symbol-*.jpg/.png` — the approved NWMLS "three trees" icons for sites
  displaying NWMLS data
- `16810950CertofExistenceGoodStandingPDF.pdf` — Terebey Technologies LLC WA
  good-standing cert (submitted to NWMLS)

MLS Grid technical docs (public, also mirrored here):
- `MLS+Grid+-+Developer+Checklist+2.pdf` — https://www.mlsgrid.com/s/MLS-Grid-Developer-Checklist-2.pdf
- `MLS+Grid+-+Best+Practices+Guide+2.pdf` — https://www.mlsgrid.com/s/MLS-Grid-Best-Practices-Guide-2.pdf
- Live docs: https://docs.mlsgrid.com/ (API v2)

## Compliance obligations (both vendor AND brokerage are responsible)

Per the MLS Grid Data License Agreement plus: NWMLS Data Use Policy, MLS Grid
IDX Rules, and NWMLS Rules 27, 196, 190, 189.

- Required NWMLS display rules: attribution, broker reciprocity branding,
  refresh frequency, the three-trees icon. (We already render the legally
  required disclaimer — see `idx-disclaimer.md`.)
- No redistribution, resale, scraping, AI training, or downstream data use.
  Display on the single broker site only.
- NWMLS advises **against** copying other member IDX sites as examples — they
  may themselves be out of compliance.

## MLS Grid API v2 — technical rules

### Auth & transport
- OAuth 2 with long-term tokens (generated in the MLS Grid web app after
  subscription approval). **Demo subscription token ≠ production token.**
- All requests must send `Accept-Encoding: gzip,deflate` (responses are gzipped).
- Every request must filter on `OriginatingSystemName` (NWMLS's value — confirm
  via docs `#originatingsystemname`; the docs' examples use `actris` as a sample).
- Media downloads must send the OAuth token in the **`user-agent` header** —
  any other user-agent is blocked.

### Prefixed KeyField Values  ⚠️ (the field NWMLS specifically flagged)
MLS Grid prepends an MLS-identifying prefix to key/local fields, e.g.
`ListingId` `123456` → `ACT123456`. Affected fields:
`ListingKey`, `ListingId`, `ListAgentMlsId`, `ListOfficeKey`, `ListOfficeMlsId`,
`MemberMlsId`, `OfficeMlsId`, `OpenHouseKey`, OpenHouse `ListingId`.

Rule: **keep the prefix when querying the API; strip it before any public
display.** Round-trip = strip for display → reattach for the next query.
Prefix list: https://docs.mlsgrid.com/api-documentation/api-version-2.0/#prefixed-keyfield-values

### Replication model (NOT real-time query-through)
- The API is a **replication/sync feed**, not a per-request proxy. You maintain
  a local synced datastore and query *that*.
- Initial import: `GET /v2/Property?$filter=OriginatingSystemName eq '<sys>' and
  MlgCanView eq true&$expand=Media,Rooms,UnitTypes`. Follow `@odata.nextLink`
  until it's absent. Repeat for `Member`, `Office`, `OpenHouse`.
- Incremental sync: poll `ModificationTimestamp gt [greatest you've seen]` per
  resource. **Every 15 minutes is sufficient.** Track the max timestamp across
  all records received, not just the ones you store.
- On error mid-import: **do not start over** — resume from greatest
  `ModificationTimestamp` received so far.
- Deletes: `MlgCanView eq true` = distributable; flips to `false` = marked for
  deletion, remove from your DB.
- Media: store locally. **Never hot-link MLS Grid Media URLs**, and never
  re-download (media is immutable; a change yields a new URL).
- Field naming: MLS-mapped fields use RESO Data Dictionary `StandardName`;
  native fields carry an MLS Local Fields prefix.
- Pagination: OData — `$top=5000` (5000-record cap/query), `$skip`, `$count=true`.
- Searchable replication fields: `ModificationTimestamp`, `OriginatingSystemName`,
  `StandardStatus`, `ListingId`, `MlgCanView`.

### Don'ts (may trigger temporary suspension)
- No range queries on `ModificationTimestamp` (use `gt` only).
- No duplicate or parallel replication requests — sequential, one at a time.
- Prefer `in (...)` over `or`; never wrap `OriginatingSystemName` / `MlgCanView`
  / `ModificationTimestamp` in parentheses; never `$top=0`.
- Don't pull OpenHouse one listing at a time.

### Rate limits
≤ 2 req/sec · ≤ 7,200 req/hr · ≤ 4 GB/hr · ≤ 40,000 req/24hr · ≤ 60 GB/24hr.
Email support@mlsgrid.com **before** the bulk initial import to request a
temporary "Grace Period" to exceed caps. Usage is visible under the
subscription's Usage tab. HTTP 429 = over limit.

## Architectural impact on lib/idx/

The current `PlaceholderProvider` reads a static JSON file per request. MLS Grid
is a **replication API**, so a faithful `NWMLSProvider` is *not* a drop-in
fetch-per-request implementation. Realistic shape:

1. A sync job (cron / scheduled function) replicates MLS Grid → a local store
   every ~15 min, honoring `MlgCanView`, prefix-stripping, and local media copy.
2. `NWMLSProvider.list()/get()` query that local store, satisfying the existing
   `IDXProvider` contract (`lib/idx/provider.ts`) unchanged.

So the UI/API boundary stays a one-line swap in `lib/idx/index.ts` (as §7.7
says), but the provider itself implies new infrastructure: a datastore, a sync
worker, and local media hosting. Scope that before promising a timeline.
