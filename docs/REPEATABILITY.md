# Repeatability

Measured 2026-10-25. Every number here comes from one scripted run of
`npm run test:repeat` (`scripts/measure-repeatability.js --runs=10`), which repeats the
correct-build suite and the defect demonstration ten times each and records what happened.

## Environment

| Item | Value |
| --- | --- |
| Node.js | v22.17.1 |
| Playwright | 1.64.1 |
| Platform | win32 10.0.26300 (Windows 11), 12 logical CPUs |
| Workers | 3 (local default; CI uses 2) |
| Retries | 0 |

## Correct build - 10 runs

| Measure | Result |
| --- | --- |
| Runs with no unexpected or flaky results | **10 of 10** |
| Checks per run | 34 every run |
| Distinct failing tests across all runs | none |
| Suite duration | min 16.8s, median 18.5s, mean 18.5s, max 22.4s |
| Wall-clock per run | min 18.0s, median 19.8s, mean 19.7s, max 24.0s |

Per-run suite seconds: 18.7, 16.8, 18.6, 17.8, 22.4, 18.7, 18.4, 17.2, 17.2, 19.2.

## Defect demonstration - 10 runs

Each run enables all four defect flags and requires the exact expected failing-test identities.

| Measure | Result |
| --- | --- |
| Runs where the exact intended-failure set was verified | **10 of 10** |
| Identical failing-test set every run | yes |
| Passing controls | 22 every run |
| Intended failures | 12 every run |
| Suite duration | min 23.9s, median 26.2s, mean 26.3s, max 28.6s |
| Wall-clock per run | min 25.1s, median 27.6s, mean 27.6s, max 29.9s |

Per-run suite seconds: 26.6, 28.6, 24.9, 26.4, 27.0, 28.0, 25.9, 25.8, 23.9, 25.6.

Medians were recomputed on 2026-10-25 after an even-sample median formula was corrected; the recorded
per-run observations are unchanged.

## What this does and does not show

It shows that across twenty consecutive runs on one machine, the correct build never produced a
failure and the defect demonstration always failed in exactly the same twelve places, with the same
twenty-two controls still passing. The spread in duration is normal scheduling variance on a shared
desktop; the slowest green run was 5.6 seconds above the fastest.

It is a ten-run sample on a single Windows machine at one point in time. It is not a long-run flake
rate, it says nothing about other operating systems or slower runners, and it does not replace the
hosted results in [HOSTED-CI-RESULTS.md](HOSTED-CI-RESULTS.md). A larger figure will only appear here
once a larger sample has actually been run.

## Reproducing it

```sh
npm run test:repeat          # 10 runs of each
npm run test:repeat -- --runs=3
```

The script writes `test-results/repeatability.json` with every per-run record. A green run counts as
clean only if it exited 0, executed all 34 checks with 34 passes, recorded no skips, flakes or
unexpected failures, and wrote a report during that run rather than leaving an earlier one in place.
A red run counts only if the defect verifier itself exited 0 on a freshly written summary. The script
exits non-zero if any run falls short or if the check count, failing set, or control count varied. The record for this sample is committed
as [repeatability.json](repeatability.json) and is rendered on the published evidence site.
