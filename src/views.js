export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,
  char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const e = escapeHtml;
export const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const roleName = role => ({ customer: "Customer", "store-owner": "Store Owner", admin: "Admin" })[role];
const dateLabel = value => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC"
}).format(new Date(value));

const iconPaths = {
  products: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  offers: '<path d="M20 13 13 20a2 2 0 0 1-3 0l-7-7V3h10l7 7a2 2 0 0 1 0 3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  checkout: '<path d="M3 3h2l3 12h11l2-8H6M9 21h.01M18 21h.01"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  orders: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  admin: '<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  logout: '<path d="M9 4H4v16h5m5-13 5 5-5 5m-6-5h12"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
export function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (iconPaths[name] || iconPaths.products) + '</svg>';
}
function logo() {
  return '<span class="brand-mark">' + icon("products") + '</span><span>fieldwork<span class="brand-dot">.</span></span>';
}
function document(title, body, bodyClass = "") {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>' +
    '<meta name="description" content="Fieldwork is a fictional shop in the Release Verification Lab."/>' +
    '<title>' + e(title) + ' | Fieldwork</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"/>' +
    '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" async></script>' +
    '<link rel="stylesheet" href="/styles.css"/><script src="/app.js" defer></script></head>' +
    '<body class="' + e(bodyClass) + '">' + body + '</body></html>';
}
function bugBanners(bugs = {}) {
  const labels = {
    BUG_AUTH_BYPASS: "Auth Bypass Active",
    BUG_WEEKEND_OFFER: "Weekend Offer Active",
    BUG_NO_LIMIT: "Purchase Limit Bypass Active",
    BUG_TOTAL_MISMATCH: "Order Total Mismatch Active"
  };
  const active = Object.entries(labels).filter(([name]) => bugs[name]);
  if (!active.length) return "";
  return '<section class="bug-banner" role="status" aria-label="Intentional demo defects">' +
    active.map(([name, label]) => '<p><strong>Warning: ' + e(label) + '</strong><code>' + e(name) + '=1</code></p>').join("") +
    '<span>Intentional defect demonstration. Synthetic data only.</span></section>';
}

export function shell({ title, active, user, balance, now, body, bugs = {} }) {
  const navigation = [["products", "Products"], ["offers", "Offers"], ["checkout", "Checkout"], ["orders", "Orders"], ["admin", "Admin"]]
    .filter(([key]) => key !== "admin" || user.role === "admin")
    .map(([key, label]) => '<a class="nav-link ' + (key === active ? "active" : "") + '" href="/' + key + '"' +
      (key === active ? ' aria-current="page"' : "") + '>' + icon(key) + '<span>' + label + '</span>' +
      (key === "offers" ? '<span class="nav-count">1</span>' : "") + '</a>').join("");
  return document(title,
    '<div class="app-shell"><aside class="sidebar"><a class="brand" href="/products">' + logo() + '</a>' +
    '<p class="nav-label">YOUR WORKSPACE</p><nav aria-label="Main navigation">' + navigation + '</nav>' +
    '<div class="sidebar-footer"><div class="demo-note"><span class="status-dot"></span> Demo storefront</div>' +
    '<p>A small shop. A little inspiration.</p><form method="post" action="/logout"><button class="signout" type="submit">' +
    icon("logout") + 'Sign out</button></form></div></aside>' +
    '<div class="workspace"><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong>' + e(title) + '</strong></div>' +
    '<div class="account-bar"><span class="role-badge">' + e(roleName(user.role)) + '</span><div class="credit"><span>Demo credit</span><strong>' +
    money(balance) + '</strong></div><span class="avatar" title="' + e(user.name) + '">' + e(user.name.split(" ").map(part => part[0]).join("")) +
    '</span></div></header><main id="main-content" class="main">' + bugBanners(bugs) + body + '</main>' +
    '<footer class="page-footer"><span>Fieldwork &copy; 2026</span><span>Demo purchases only &middot; ' +
    e(now.toISOString().slice(0, 10)) + ' UTC</span></footer></div></div>');
}
export function loginPage(error = "", email = "", bugs = {}) {
  const accounts = [["customer", "Customer"], ["owner", "Store Owner"], ["admin", "Admin"]];
  return document("Sign in",
    '<main class="login-layout"><section class="login-story"><a class="brand" href="/login">' + logo() + '</a>' +
    '<div class="story-copy"><span class="eyebrow light">A LITTLE MORE INTENTIONAL</span><h1>Good things.<br/>For your everyday.</h1>' +
    '<p>A considered collection for work, home, and the moments in between.</p><div class="story-art" aria-hidden="true">' +
    artwork("lamp") + '</div></div><p class="story-footer">Thoughtfully simple, from start to checkout.</p></section>' +
    '<section class="login-form-section"><div class="login-card"><span class="eyebrow">WELCOME TO FIELDWORK</span><h2>Make yourself at home.</h2>' +
    '<p class="muted">Sign in to explore the collection.</p>' + bugBanners(bugs) +
    (error ? '<div class="alert error" role="alert">' + e(error) + '</div>' : "") +
    '<form method="post" action="/login" class="login-form"><label for="email">Email address</label>' +
    '<input id="email" name="email" type="email" autocomplete="username" required maxlength="254" value="' + e(email) + '" placeholder="customer@example.test"/>' +
    '<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"/>' +
    '<button class="button primary full" type="submit">Sign in ' + icon("arrow") + '</button></form>' +
    '<div class="demo-accounts"><span class="eyebrow">TRY A DEMO ACCOUNT</span><p>Choose a role to fill in its sign-in details.</p><div class="role-options">' +
    accounts.map(([key, name]) => '<button type="button" class="role-choice" data-demo-role="' + key + '">' + name + '</button>').join("") +
    '</div><p class="login-disclaimer">Fictional accounts and purchases. No payment information needed.</p></div></section></main>', "login-body");
}
export function artwork(name) {
  const drawings = {
    journal: '<rect x="69" y="34" width="105" height="140" rx="9" fill="#6e8169" transform="rotate(-10 120 105)"/><path d="m72 44 22 138" stroke="#435c42" stroke-width="4"/><path d="m103 74 43-8m-40 20 30-5" stroke="#e0e5d5" stroke-width="3"/><path d="m149 37 23 136" stroke="#a9b79c" stroke-width="2"/><rect x="165" y="75" width="8" height="112" rx="3" fill="#c69d6c" transform="rotate(15 169 130)"/>',
    headphones: '<path d="M70 125V96a50 50 0 0 1 100 0v29" fill="none" stroke="#263638" stroke-width="15"/><path d="M78 87a43 43 0 0 1 84 0" fill="none" stroke="#647778" stroke-width="6"/><rect x="57" y="105" width="35" height="66" rx="15" fill="#35494a"/><rect x="148" y="105" width="35" height="66" rx="15" fill="#35494a"/><path d="M72 119v36m93-36v36" stroke="#758b87" stroke-width="3"/>',
    mug: '<path d="M165 80h11a28 28 0 0 1 0 56h-11" fill="none" stroke="#a56e50" stroke-width="13"/><path d="M68 69h102v70a31 31 0 0 1-31 31H99a31 31 0 0 1-31-31Z" fill="#c18b66"/><ellipse cx="119" cy="69" rx="51" ry="12" fill="#dfb491"/><ellipse cx="119" cy="69" rx="42" ry="7" fill="#775240"/><path d="M91 92v39" stroke="#ddb08a" stroke-width="6" stroke-linecap="round"/>',
    lamp: '<ellipse cx="123" cy="178" rx="45" ry="8" fill="#a8b3a0"/><path d="M121 170V91l32-41" fill="none" stroke="#354838" stroke-width="8" stroke-linecap="round"/><path d="m153 43 39 49-77 4Z" fill="#668068" transform="rotate(15 153 70)"/><ellipse cx="145" cy="96" rx="38" ry="6" fill="#d3d6af" transform="rotate(15 145 96)"/><path d="M96 171h52l12 10H84Z" fill="#435d45"/>'
  };
  return '<svg viewBox="0 0 240 210" class="product-art" role="img" aria-label="' + e(name) + ' illustration"><ellipse cx="122" cy="185" rx="65" ry="8" fill="#17231a" opacity=".06"/>' + (drawings[name] || drawings.journal) + '</svg>';
}
function heading(eyebrow, title, description, extra = "") {
  return '<div class="page-heading"><div><span class="eyebrow">' + e(eyebrow) + '</span><h1>' + e(title) +
    '</h1><p class="muted">' + e(description) + '</p></div>' + extra + '</div>';
}
export function productsPage(products, query) {
  return heading("THE COLLECTION", "Everyday, thoughtfully chosen.", "A few good things to make your space feel like you.",
    '<span class="pill neutral">' + products.length + ' items</span>') +
    '<section class="collection-banner"><div><span class="eyebrow">THE WEEKEND EDIT</span><h2>A fresh page for your weekend.</h2>' +
    '<p>Our everyday journal, with a little extra reason to start.</p><a class="text-link" href="/offers">Explore the offer ' +
    icon("arrow") + '</a></div><div class="banner-art">' + artwork("journal") + '</div></section>' +
    '<div class="section-toolbar"><h2>Shop the essentials</h2><form action="/products" method="get" class="search-box">' +
    '<label class="sr-only" for="search">Search products</label>' + icon("search") + '<input id="search" name="q" type="search" maxlength="100" value="' +
    e(query) + '" placeholder="Search the collection"/><button type="submit" class="sr-only">Search</button></form></div>' +
    (products.length ? '<div class="product-grid">' + products.map(product =>
      '<article class="product-card"><div class="art-panel art-' + e(product.artwork) + '">' + artwork(product.artwork) +
      '<span class="product-category">' + e(product.category) + '</span></div><div class="product-details"><h3>' + e(product.name) +
      '</h3><p>' + e(product.description) + '</p><div class="product-bottom"><strong>' + money(product.price_cents) +
      '</strong><a class="add-button" href="/checkout?product=' + product.id + '" aria-label="Buy ' + e(product.name) + '">' +
      icon("arrow") + '</a></div></div></article>').join("") + '</div>' :
      '<div class="empty-state"><h2>No matching products</h2><p>Try another search or browse the full collection.</p><a href="/products" class="button secondary">View all products</a></div>') +
    '<p class="collection-footnote">' + icon("check") + ' Clear prices. Simple checkout. A little less to think about.</p>';
}
export function offersPage(offers) {
  return heading("A LITTLE SOMETHING EXTRA", "The weekend edit.", "Small offers, thoughtfully timed. All offer windows use UTC.") +
    offers.map(offer => '<article class="offer-card"><div class="offer-art">' + artwork(offer.artwork) +
      '</div><div class="offer-copy"><span class="pill ' + (offer.available ? "success" : "neutral") + '">' +
      (offer.available ? "Available this weekend" : "Currently unavailable") + '</span><h2>' + e(offer.name) + '</h2><h3>' +
      e(offer.product_name) + '</h3><p class="muted">' + e(offer.description) + '</p><div class="offer-price"><strong>' +
      money(offer.price_cents) + '</strong><s>' + money(offer.regular_price_cents) + '</s><span class="pill success">Save ' +
      money(offer.regular_price_cents - offer.price_cents) + '</span></div><p class="offer-rule">' + icon("clock") + e(offer.reason) +
      '</p>' + (offer.available ? '<a class="button primary" href="/checkout?product=' + offer.product_id + '&amp;offer=' + offer.id +
      '">Claim offer ' + icon("arrow") + '</a>' : '<button class="button secondary" disabled>Offer unavailable</button>') + '</div></article>').join("");
}
export function checkoutPage(quote, error = "") {
  const title = heading("ONE STEP TO SOMETHING GOOD", "Your checkout.", "Review your item and place a demo order.");
  if (!quote) return title + (error ? '<div role="alert" class="alert error">' + e(error) + '</div>' : "") +
    '<div class="empty-state">' + icon("checkout") + '<h2>Your next favourite is waiting.</h2><p>Choose an item from the collection to begin.</p>' +
    '<a class="button primary" href="/products">Explore products ' + icon("arrow") + '</a></div>';
  return title + (error ? '<div role="alert" class="alert error">' + e(error) + '</div>' : "") +
    '<div class="checkout-grid"><section class="panel"><div class="panel-heading"><h2>Your item</h2><a href="/products" class="subtle-link">Continue shopping</a></div>' +
    '<div class="checkout-item"><div class="mini-art art-' + e(quote.product.artwork) + '">' + artwork(quote.product.artwork) +
    '</div><div><span class="eyebrow">' + e(quote.product.category) + '</span><h3>' + e(quote.product.name) + '</h3><p class="muted">Quantity: 1</p>' +
    (quote.offer ? '<span class="pill success">' + e(quote.offer.name) + '</span>' : "") + '</div><strong>' + money(quote.total_cents) + '</strong></div>' +
    '<div class="payment-note">' + icon("admin") + '<div><strong>Simple, simulated payment</strong><p>Your demo credit covers this order. No card details needed.</p></div></div></section>' +
    '<aside class="panel order-summary"><h2>Order summary</h2><dl><div><dt>Subtotal</dt><dd>' + money(quote.total_cents) +
    '</dd></div><div><dt>Delivery</dt><dd class="green-text">Free</dd></div><div class="summary-total"><dt>Total</dt><dd data-testid="checkout-total" data-cents="' +
    quote.total_cents + '">' + money(quote.total_cents) + '</dd></div></dl><form method="post" action="/checkout"><input type="hidden" name="product_id" value="' +
    quote.product.id + '"/>' + (quote.offer ? '<input type="hidden" name="offer_id" value="' + quote.offer.id + '"/>' : "") +
    '<button class="button primary full" type="submit">Place demo order ' + icon("arrow") + '</button></form><p class="summary-note">Available demo credit: ' +
    money(quote.balance_cents) + '</p></aside></div>';
}
function orderTable(orders, all = false) {
  if (!orders.length) return '<div class="empty-state"><h2>No orders yet</h2><p>Your first good find is just around the corner.</p><a class="button primary" href="/products">Browse products</a></div>';
  return '<div class="table-scroll"><table><thead><tr><th>Order</th>' + (all ? '<th>Customer</th>' : "") +
    '<th>Date (UTC)</th><th>Status</th><th class="align-right">Total</th><th><span class="sr-only">Details</span></th></tr></thead><tbody>' +
    orders.map(order => '<tr><td><strong>#FW-' + order.id + '</strong></td>' + (all ? '<td>' + e(order.customer_name) + '</td>' : "") +
    '<td>' + e(dateLabel(order.created_at)) + '</td><td><span class="pill success"><span class="status-dot"></span>Completed</span></td>' +
    '<td class="align-right">' + money(order.total_cents) + '</td><td><a class="subtle-link" href="/orders/' + order.id + '">View order ' +
    icon("arrow") + '</a></td></tr>').join("") + '</tbody></table></div>';
}
export function ordersPage(orders) {
  return heading("YOUR GOOD FINDS", "Order history.", "Everything you have picked up, all in one place.") +
    '<section class="panel table-panel">' + orderTable(orders) + '</section>';
}
export function receiptPage(order, bugs = {}) {
  // Seeded presentation defect: the summary reuses the first line-item total
  // instead of the complete order. The stored order and ledger stay correct.
  const firstItem = order.items[0];
  const displayedTotal = bugs.BUG_TOTAL_MISMATCH
    ? (firstItem?.unit_price_cents || 0) * (firstItem?.quantity || 0)
    : order.total_cents;
  const ledgerTotal = -order.ledger.reduce((sum, entry) => sum + entry.amount_cents, 0);
  return heading("THANK YOU FOR STOPPING BY", "A good choice.", "Your demo order is complete. Here is your receipt.",
    '<a class="button secondary" href="/products">Back to the collection ' + icon("arrow") + '</a>') +
    '<section class="panel"><div class="panel-heading"><div><span class="eyebrow">ORDER #FW-' + order.id + '</span><h2>Order details</h2></div>' +
    '<span class="pill success">' + icon("check") + 'Completed</span></div>' +
    order.items.map(item => '<div class="receipt-line"><span>' + e(item.product_name) + ' <span class="muted">&times; ' + item.quantity +
      '</span></span><strong>' + money(item.unit_price_cents * item.quantity) + '</strong></div>').join("") +
    '<div class="receipt-line receipt-total"><strong>Order total</strong><strong data-testid="order-total" data-cents="' + displayedTotal + '">' +
    money(displayedTotal) + '</strong></div></section>' +
    '<section class="panel table-panel ledger-panel"><div class="panel-heading"><div><span class="eyebrow">PAYMENT RECORD</span><h2>Transactions</h2></div>' +
    '<span class="muted">' + e(dateLabel(order.created_at)) + ' UTC</span></div><div class="table-scroll"><table><thead><tr><th>Reference</th><th>Description</th><th>Type</th><th class="align-right">Amount</th></tr></thead><tbody>' +
    order.ledger.map(entry => '<tr><td>TX-' + String(entry.id).padStart(4, "0") + '</td><td>' + e(entry.description) +
      '</td><td>Demo purchase</td><td class="align-right">' + money(-entry.amount_cents) + '</td></tr>').join("") +
    '</tbody><tfoot><tr><td colspan="3">Recorded total</td><td class="align-right" data-testid="ledger-total" data-cents="' +
    ledgerTotal + '">' + money(ledgerTotal) + '</td></tr></tfoot></table></div></section>';
}
export function adminPage(stats, orders) {
  return heading("STORE OVERVIEW", "A little perspective.", "A read-only view of this fictional store.") +
    '<div class="stat-grid">' + [["Products", stats.products], ["Customers & staff", stats.users], ["Completed orders", stats.orders],
      ["Recorded sales", money(stats.sales_cents)]].map(([label, value]) => '<section class="stat-card"><span>' + e(label) +
      '</span><strong>' + e(value) + '</strong></section>').join("") + '</div>' +
    '<section class="panel table-panel"><div class="panel-heading"><h2>All orders</h2><span class="pill neutral">Admin access</span></div>' +
    orderTable(orders, true) + '</section>';
}
export function errorPage(status, message) {
  return '<div class="empty-state"><span class="eyebrow">' + status + '</span><h1>' + e(message) +
    '</h1><a class="button secondary" href="/products">Return to products</a></div>';
}
