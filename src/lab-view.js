import { BASELINE_CHECKS, DEFECTS } from "./defects.js";

const help = {
  auth: ["Accept invalid logins", "Lets an existing account sign in with the wrong password. Unknown emails also get a new session.", "Sign out, choose Customer on Login, then change the password before signing in."],
  weekend: ["Keep weekend offers open", "Removes the weekend-only check, so the promotional offer can be bought on a weekday.", "Choose Monday below, then open Offers and try adding the weekend deal to your cart."],
  limit: ["Bypass the purchase limit", "Lets a direct purchase request buy the same offer again after its one-purchase limit. The normal button still blocks repeats.", "Buy the offer once, then use Send direct repeat purchase on Offers."],
  total: ["Show the wrong receipt total", "Shows only the first product line on a multi-product receipt. Checkout and the transaction ledger still record the full amount.", "Buy two different products, then compare the receipt total with Transactions."]
};

export function labToolbar() {
  return '<section class="shop-lab" aria-label="Live demo controls">' +
    '<button type="button" id="toggle-playground" class="playground-toggle" aria-expanded="false" aria-controls="lab-settings">' +
    '<span aria-hidden="true">&#9881;</span> QA playground <span class="playground-chevron" aria-hidden="true">&#8964;</span></button>' +
    '<span class="playground-tagline">Introduce a bug. See what breaks.</span>' +
    '<div class="lab-toolbar-actions"><span id="bug-count" class="pill neutral">All off</span>' +
    '<button type="button" id="guide-toggle" class="lab-guide-button" aria-expanded="true">Guide</button>' +
    '<button type="button" id="open-tests" class="button test-launch"><span class="test-launch-icon" aria-hidden="true">&#9654;</span>' +
    '<span id="test-launch-label">Run checks</span></button></div></section>';
}

export function labTools({ admin = false, toolbar = true } = {}) {
  return (toolbar ? labToolbar() : '') +
    '<form id="lab-settings" class="qa-playground" aria-labelledby="playground-heading" hidden data-total-checks="' + BASELINE_CHECKS + '">' +
    '<button type="button" id="close-playground" class="icon-button" aria-label="Close QA playground">&times;</button>' +
    '<div class="playground-heading"><div><span class="eyebrow">EXPLORE THE QA PLAYGROUND</span><h2 id="playground-heading" tabindex="-1">Choose what goes wrong.</h2>' +
    '<p>These switches introduce intentional bugs in your own demo shop. Turn one on, try its steps, then run the checks to see the evidence.</p></div></div>' +
    '<div class="inline-switches">' + DEFECTS.map(defect => '<article class="bug-card"><label class="inline-switch" title="' + defect.description +
      '"><strong>' + help[defect.id][0] + '</strong><input type="checkbox" role="switch" aria-label="' + defect.label + '" name="' + defect.flag +
      '" aria-describedby="bug-help-' + defect.id + '" data-failure-count="' + defect.failures.length +
      '"/><span class="switch-track" aria-hidden="true"></span></label><p id="bug-help-' + defect.id + '">' + help[defect.id][1] +
      '</p><details class="bug-instructions"><summary>How to try it <span>' + defect.failures.length +
      (defect.failures.length === 1 ? ' check' : ' checks') + '</span></summary><p class="bug-try">' + help[defect.id][2] + '</p></details></article>').join("") +
    '</div><div class="playground-footer"><p id="bug-expectation" role="status">All ' + BASELINE_CHECKS + ' checks should pass with the bugs off.</p>' +
    '<details class="lab-day"><summary>Day: <span id="clock-label">Saturday</span></summary><div class="day-popover">' +
    '<label for="demo-clock">Demo day (UTC)</label><select id="demo-clock" name="clock">' +
    '<option value="saturday">Saturday ? offer open</option><option value="sunday">Sunday ? just before expiry</option>' +
    '<option value="monday">Monday ? offer closed</option><option value="real">Today ? real clock</option></select>' +
    '<p id="clock-value" class="summary-note"></p><button type="submit" class="button primary">Apply day</button>' +
    '<button type="button" class="button secondary" id="all-off">Switch all bugs off</button>' +
    '<button type="button" class="button secondary" id="reset-shop">' + (admin ? 'Reset demo shop' : 'Reset my purchases') + '</button></div></details>' +
    '</div></form>' +
    '<div id="lab-message" class="lab-message" role="status" aria-live="polite"></div>' +
    '<aside id="guide-coach" class="context-guide" aria-label="Shopping guide" hidden>' +
    '<div class="guide-orbit" aria-hidden="true">&#10022;</div><div class="guide-copy"><span id="guide-step" class="eyebrow"></span>' +
    '<h2 id="guide-title"></h2><p id="guide-copy"></p><div class="guide-progress"><span id="guide-progress-fill"></span></div></div>' +
    '<button type="button" id="guide-action" class="button secondary"></button>' +
    '<button type="button" id="guide-dismiss" class="icon-button" aria-label="Dismiss guide">&times;</button></aside>' +
    '<div id="direct-tools" class="direct-tools" hidden><span>Complete one offer checkout, then try a direct repeat request:</span>' +
    '<button type="button" id="repeat-offer" class="button secondary">Send direct repeat purchase</button>' +
    '<pre id="repeat-result" class="lab-log" hidden></pre></div>';
}

export function labDialogs() {
  return '<dialog id="reset-dialog" class="reset-dialog" aria-labelledby="reset-heading" aria-describedby="reset-description">' +
    '<h2 id="reset-heading">Reset your demo shop?</h2><p id="reset-description">This clears carts, purchases and registered accounts, and signs out demo accounts in your shop. Seeded customers return to $1,000 credit. This cannot be undone. Your bug switches and demo day stay the same.</p>' +
    '<p id="reset-error" role="alert"></p><form method="dialog" class="reset-actions"><button class="button secondary" value="cancel" autofocus>Keep shopping</button>' +
    '<button type="button" id="confirm-reset" class="button danger">Reset purchases</button></form></dialog>' +
    '<dialog id="test-drawer" class="verification-drawer" aria-labelledby="run-heading">' +
    '<div class="drawer-heading"><div><span class="eyebrow">REAL CHECKS. REAL EVIDENCE.</span><h2 id="run-heading">Verify this experience</h2></div>' +
    '<div class="drawer-actions"><button type="button" id="toggle-report-view" class="button secondary" hidden>Read report</button>' +
    '<button type="button" class="icon-button" id="close-tests" aria-label="Close test panel">&times;</button></div></div>' +
    '<aside id="bug-caught-alert" class="bug-caught-alert" role="status" aria-live="polite" aria-atomic="true" hidden>' +
    '<span class="caught-symbol" aria-hidden="true">&#9678;</span><div><strong id="bug-caught-title"></strong><p id="bug-caught-copy"></p></div></aside>' +
    '<div class="drawer-body"><section class="lab-runner"><div class="runner-intro"><p class="muted">Choose your setup, watch the checks run, then inspect the evidence.</p>' +
    '<span id="run-badge" class="pill neutral">Ready</span></div>' +
    '<label for="run-mode">Test setup</label><select id="run-mode"><option value="current">My current bug switches</option>' +
    '<option value="baseline">Correct build ? all bugs off</option><option value="all">All four bugs on</option></select>' +
    '<p class="lab-footnote">Checks use isolated data and controlled dates. Your cart, purchases, and credit are preserved.</p>' +
    '<div class="lab-run-actions"><button type="button" id="run-tests" class="button primary">Run tests</button>' +
    '<button type="button" id="cancel-run" class="button secondary" hidden>Stop run</button></div>' +
    '<p id="runner-message" class="lab-message" role="status" aria-live="polite"></p>' +
    '<div id="run-progress" hidden><div class="lab-progress-header"><strong id="run-status">Starting?</strong><span id="run-elapsed">0s</span></div>' +
    '<div id="test-progress" class="test-progress" role="progressbar" aria-label="Tests completed" aria-valuemin="0" aria-valuemax="' + BASELINE_CHECKS + '" aria-valuenow="0"><span id="test-progress-fill"></span></div><p id="run-counts"></p>' +
    '<p id="run-snapshot" class="lab-footnote"></p><ul id="run-detections" class="run-detections" aria-label="Detection of enabled bugs" hidden></ul>' +
    '<p id="current-check" class="current-check" role="status" aria-live="polite"></p>' +
    '<ol id="run-checks" class="run-checks" aria-label="Test case results"></ol></div>' +
    '<div id="run-result" class="lab-result" hidden></div><a id="open-report" class="text-link" hidden>Open full report &rarr;</a>' +
    '<p class="lab-footnote">Bugs on? Some failures are expected. Detection is verified only when the exact expected failures match.</p></section>' +
    '<section id="report-section" class="lab-report" hidden><div class="panel-heading"><div><h2>Your pass/fail report</h2><p id="report-verdict" class="lab-footnote"></p></div>' +
    '<a id="report-new-tab" class="text-link" target="_blank" rel="noopener">Open in a new tab &rarr;</a></div>' +
    '<iframe id="report-frame" title="Playwright pass/fail report"></iframe></section></div></dialog>';
}
