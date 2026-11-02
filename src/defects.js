const key = (project, title) => project + "::" + title;

export const BASELINE_CHECKS = 47;
export const DEFECTS = [
  {
    id: "auth", flag: "BUG_AUTH_BYPASS", label: "Accept invalid logins",
    description: "A wrong password lets someone into the shop.",
    failures: [
      key("api", "invalid credentials are rejected: wrong password @auth"),
      key("api", "invalid credentials are rejected: unknown account @auth"),
      key("e2e", "invalid credentials show an error without logging in @auth"),
      key("security", "SQL-like email cannot authenticate @auth"),
      key("security", "SQL-like password cannot authenticate @auth")
    ]
  },
  {
    id: "weekend", flag: "BUG_WEEKEND_OFFER", label: "Allow weekday offers",
    description: "The weekend offer can be purchased on a Monday.",
    failures: [
      key("api", "UTC offer window: Friday before opening @weekend"),
      key("api", "UTC offer window: Monday at closing @weekend"),
      key("e2e", "the Monday offer is unavailable in the UI @weekend"),
      key("e2e", "a checkout opened on Sunday is refused after Monday begins @weekend"),
      key("db", "a rejected weekday purchase leaves orders, items, and ledger unchanged @weekend")
    ]
  },
  {
    id: "limit", flag: "BUG_NO_LIMIT", label: "Bypass purchase limits",
    description: "A direct request can buy a claimed offer again.",
    failures: [key("api", "a direct second purchase of the same offer is refused @limit")]
  },
  {
    id: "total", flag: "BUG_TOTAL_MISMATCH", label: "Show the wrong receipt total",
    description: "A multi-item receipt shows only its first line; the ledger stays correct.",
    failures: [key("db", "a manually built multi-item receipt matches independent ledger and item sums @total")]
  }
];

export function expectedFailures(bugs) {
  return DEFECTS.filter(defect => bugs[defect.flag]).flatMap(defect => defect.failures).sort();
}

export function isAssertionFailure(result) {
  const errors = result.errors || (result.error ? [result.error] : []);
  const message = (errors[0]?.message || "").replace(/\u001b\[[0-9;]*m/g, "");
  return result.status === "failed" && (result.retry || 0) === 0 && errors.length === 1 && /\bexpect\s*(?:\(|\.)/.test(message);
}

export function detectedBug(check, bugs) {
  if (check.status !== "failed" || !check.assertionFailure) return null;
  return DEFECTS.find(defect => bugs[defect.flag] && defect.failures.includes(key(check.project, check.title))) || null;
}

export function detectionProgress(bugs, checks, { status, matched } = {}) {
  return DEFECTS.filter(defect => bugs[defect.flag]).map(defect => {
    const found = new Set(checks.filter(check => detectedBug(check, bugs)?.id === defect.id).map(check => key(check.project, check.title)));
    const verified = status === "completed" && matched === true && found.size === defect.failures.length;
    return {
      id: defect.id, flag: defect.flag, label: defect.label, expected: defect.failures.length, observed: found.size,
      state: verified ? "verified" : status === "running" ? found.size ? "observed" : "pending" : "review"
    };
  });
}
