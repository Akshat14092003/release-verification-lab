# Repeatability

The current suite has **47 release checks**. Retries remain disabled.

## Current sample - 2026-11-03 (India time)

Command: `CI=true npm run test:repeat -- --runs=3`. Windows 11, Node v22.17.1,
Playwright 1.64.1, two workers. All six full-suite executions completed:

| Measure | Correct build | All four defects |
| --- | --- | --- |
| Accepted runs | 3/3 | 3/3 |
| Passing checks per run | 47 | 35 |
| Intended failures per run | 0 | 12 |
| Suite duration range | 70.742-78.533s | 92.263-102.430s |
| Unexpected failures, skips, flakes | 0 | 0 |

Every red run matched the exact same twelve failing identities. Fresh report
timestamps/tokens, complete counts and process exit results were checked.
Raw observations: [repeatability.json](repeatability.json).

Before this sample, the two affected settings/reset browser journeys each passed
eight repeats (16 successful executions). The settings check deliberately delays
content refresh and verifies that the displayed clock waits for refreshed
content. The reset check waits for the signed-out UI before reading account state.

## Initial repair sample - retained failures

The first five-pair sample on the preceding revision had **4/5 clean green runs**
and **5/5 verified red runs**. Its first green run had two unexpected failures:
settings/day/login navigation, and visitor reset isolation. The four following
green runs passed 47/47. This was not a clean study and is not presented as one.

The subsequent synchronization changes were followed by the current three-pair
sample above. The initial failures are preserved, without rewriting their
observations: [repeatability-47-initial.json](repeatability-47-initial.json).
The new clean sample does not prove that every possible timing failure is gone.

## Historical 34-check version

The earlier ten-green/ten-red measurement belongs to a smaller suite. Its original
observations remain in [repeatability-34.json](repeatability-34.json); its report is
[REPEATABILITY-34.md](REPEATABILITY-34.md). It is not current 47-check evidence.

## Reproduce

```powershell
$env:CI = "true"
npm.cmd run test:repeat -- --runs=3
Remove-Item Env:CI
```

`npm run test:repeat` defaults to ten of each. The script writes every observation
to `test-results/repeatability.json` and exits nonzero if any run fails acceptance.
Run browser-heavy checks sequentially so unrelated local runs do not contend.

This is a small sample from one Windows machine, not a long-run flake rate,
cross-browser certification, or a benchmark of a free hosting service. Hosted
release and container evidence are separate: [current results](CURRENT-RESULTS.md).
