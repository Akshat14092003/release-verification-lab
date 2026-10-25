# Hosted GitHub Actions verification

Verified: 2026-10-25.

- Repository: [Akshat14092003/release-verification-lab](https://github.com/Akshat14092003/release-verification-lab).
- Tested code commit: [6b93a50](https://github.com/Akshat14092003/release-verification-lab/commit/6b93a50affa3ee114188f1b288ec169bc92e9da2).
- Successful workflow: [run 40180501884](https://github.com/Akshat14092003/release-verification-lab/actions/runs/40180501884).
- Runner: Ubuntu 24.04; workflow Node version: 22.17.1.

| Job | Verified outcome | Test duration |
| --- | --- | --- |
| Correct build | 34 passed; 0 failures; 0 skipped | 17.8s |
| Detect the seeded defects | 22 passing controls; exactly 12 intended assertion failures | 27.1s |

Both GitHub jobs concluded successfully. The underlying red test run contains real failed assertions;
the wrapper succeeded only because the exact expected failure identities and fresh run metadata matched.

Evidence was not inferred from the job status alone. Both green-evidence and red-evidence were downloaded,
and their JSON reports and red verification summary were inspected.
Artifacts include HTML reports, JUnit/JSON, screenshots, traces, HTTP/SQL evidence, and disposable synthetic test databases.

The security layer adds SQL-like-input and reflected/stored XSS probes. Auth-bypass red failures in
SQL-like login probes are missing-credential-verification evidence, not proof of SQL parser injection.

Private planning, authentication helpers/configuration, generated databases, and local reports are excluded from source control.
Measurements describe this hosted run. They are not a long-run flake-rate or cross-browser claim.

Follow-up documentation-only commits may use [skip ci]; application, test, and workflow files from the tested code commit remain unchanged.
