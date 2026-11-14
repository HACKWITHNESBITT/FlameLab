# TWO_DAY_PLAN

Six developers, two days. Steps within each developer's list are in priority order: if time runs short, cut from the end.

Time blocks: **Day 1 AM, Day 1 PM, Day 2 AM, Day 2 PM.** Phase 0 is the first two hours of Day 1 AM.

## Gates

| Gate | When | Condition |
| --- | --- | --- |
| G1 Schema frozen | End of Phase 0 | Schema v1 agreed; mock API published |
| G2 Real data live | End of Day 1 PM | Curated records load; API serves real data; ranking works |
| G3 Demo ready | End of Day 2 PM | Core journeys pass; SI verified; docs current |

## Phase 0 (first 2 hours, everyone)

1. Read the brief; agree audience and the three core questions.
2. Agree the investigation list (`docs/INVESTIGATIONS.md`).
3. Review and freeze `docs/DATA_SCHEMA.md` v1.
4. Choose the stack; set up the repository, board and branch rules.
5. Write environment profiles (assumptions labelled).
6. Agree SI grounding rules (`docs/SI_GUIDELINES.md`).

## Dev 1: data curation

| Block | Tasks |
| --- | --- |
| Day 1 AM | Map PSI; build the extraction template; start solid-fuel records (BASS, BASS-II, Saffire) |
| Day 1 PM | Finish solids; detection (SAME, SAME-R, DAFT); suppression (FLEX, FLEX-2); validate and hand to Dev 2 |
| Day 2 AM | Gaseous and droplet records (ACME, CFI, SPICE, SLICE); within-investigation variation notes; data-quality flags |
| Day 2 PM | Spot-check five records with Dev 6; fix errors; support demo |

## Dev 2: data model, database, API

| Block | Tasks |
| --- | --- |
| Day 1 AM | Schema v1; project skeleton; mock API responses (by end of Phase 0) |
| Day 1 PM | Loader with validation; read, filter, detail endpoints; ranking and conditions endpoints wired |
| Day 2 AM | Compare, gaps and export endpoints; API docs |
| Day 2 PM | Tests; performance and error handling |

## Dev 3: ranking and scoring

| Block | Tasks |
| --- | --- |
| Day 1 AM | Environment profiles; factor definitions; weights config |
| Day 1 PM | Scoring v1 with breakdowns; golden tests with Dev 1 |
| Day 2 AM | Lenses; modeling readiness and equipment relevance scores; partial-gravity flag |
| Day 2 PM | Tune with Dev 1; finalize `docs/SCORING.md` |

## Dev 4: SI layer

| Block | Tasks |
| --- | --- |
| Day 1 AM | Grounding rules; citation format; verifier skeleton |
| Day 1 PM | Per-investigation summary generation; verification; first evaluation cases |
| Day 2 AM | Comparison and environment interpretation; grounded Q&A with not-covered handling |
| Day 2 PM | Evaluation set to 20 or more cases; zero unsupported claims; logging |

## Dev 5: frontend

| Block | Tasks |
| --- | --- |
| Day 1 AM | App shell on the mock API; environment selector; lens control |
| Day 1 PM | Ranked list with filters and search; detail page layout; connect to real API as it lands |
| Day 2 AM | SI text with citations; Ask panel; gaps view |
| Day 2 PM | Polish; loading, empty and error states; accessibility pass |

## Dev 6: visualization, export, Earth applications, QA

| Block | Tasks |
| --- | --- |
| Day 1 AM | Test plan and tooling; conditions map prototype on mock data |
| Day 1 PM | Comparison view; variable explorer |
| Day 2 AM | Data export; equipment and controls view; Earth applications panel (documented links only) |
| Day 2 PM | End-to-end tests; content audit; demo script and user guide |

## Dependencies

| Needs | From | By |
| --- | --- | --- |
| Schema v1 | Dev 2 (with all) | End of Phase 0 |
| Mock API | Dev 2 | End of Phase 0 |
| Curated records | Dev 1 | Day 1 PM |
| Environment profiles | Dev 3 | Day 1 AM |
| Factor breakdowns | Dev 3 | Day 1 PM |
| Verified SI text | Dev 4 | Day 2 AM |

## Minimum viable demo (if time is short)

1. Environment selector and ranked list with score breakdowns.
2. Investigation detail with a verified SI summary.
3. Conditions map with the target atmosphere zone.
4. Visible gaps view.
5. Export.

Cut in this order if needed: Earth applications panel, variable explorer, equipment view, comparison SI commentary.
