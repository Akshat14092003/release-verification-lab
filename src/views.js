export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,
  char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const e = escapeHtml;
export const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const roleName = role => ({ customer: "Customer", admin: "Admin" })[role];
const dateLabel = value => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC"
}).format(new Date(value));

const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/>',
  products: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  offers: '<path d="M20 13 13 20a2 2 0 0 1-3 0l-7-7V3h10l7 7a2 2 0 0 1 0 3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  checkout: '<path d="M3 3h2l3 12h11l2-8H6M9 21h.01M18 21h.01"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  orders: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  admin: '<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  customers: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/>',
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
  return '<span class="brand-mark">' + icon("products") + '</span><span class="brand-wordmark">fieldwork<span class="brand-dot">.</span></span>';
}
export function themeButton() {
  return '<button type="button" class="theme-toggle" data-theme-toggle aria-label="Switch to dark mode">' +
    '<svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/>' +
    '<path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>' +
    '<svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<path d="M20 14a8.5 8.5 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/></svg><span class="menu-control-label">Appearance</span></button>';
}
export function document(title, body, bodyClass = "", labControls = false) {
  const admin = bodyClass.split(" ").includes("admin-body");
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>' +
    '<meta name="description" content="Fieldwork is a fictional shop in the Release Verification Lab."/>' +
    '<title>' + e(title) + ' | Fieldwork</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"/>' +
    '<script src="/theme.js"></script><link rel="stylesheet" href="/tokens.css"/><link rel="stylesheet" href="/styles.css"/><link rel="stylesheet" href="/theme.css"/>' +
    '<link rel="stylesheet" href="/shop.css"/>' + (labControls ? '<link rel="stylesheet" href="/lab.css"/>' : '') + '<link rel="stylesheet" href="/glass.css"/><link rel="stylesheet" href="/blue.css"/>' +
    '<link rel="stylesheet" href="/experience.css"/><script src="/motion.js" defer></script><script src="/app.js" defer></script><script src="/bug.js" defer></script>' + (labControls ? '<script src="/lab.js" defer></script><script src="/guide.js" defer></script>' : '') + '</head>' +
    '<body class="' + e(bodyClass) + (labControls ? ' has-lab' : '') + '">' + body + bugHunt() +
    '<div class="cart-toast" id="cart-toast" role="status" aria-live="polite" hidden><span class="toast-check">&#10003;</span><span id="cart-toast-text"></span>' +
    (admin ? '' : '<a href="/cart">View cart &rarr;</a>') + '<button type="button" class="icon-button" id="dismiss-cart-toast" aria-label="Dismiss notification">&times;</button></div></body></html>';
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

export function shell({ title, active, user, balance, now, body, bugs = {}, labControls = false, cart = { count: 0 } }) {
  const admin = user?.role === "admin";
  const home = admin ? "/admin" : "/";
  const navigation = (admin ? [["admin", "Overview", "/admin"], ["products", "Products", "/admin/products"], ["orders", "Orders", "/admin/orders"], ["customers", "Customers", "/admin/customers"]]
    : [["home", "Home", "/"], ["products", "Products"], ["offers", "Offers"], ["cart", "Cart"], ["checkout", "Checkout"], ["orders", "Orders"]])
    .map(([key, label, href]) => '<a class="nav-link ' + (key === active ? "active" : "") + '" href="' + (href || '/' + key) + '" aria-label="' + label + '" title="' + label + '"' +
      (key === active ? ' aria-current="page"' : "") + '>' + icon(key === "cart" ? "checkout" : key) + '<span class="nav-text">' + label + '</span>' +
      (key === "cart" ? '<span class="nav-count" data-cart-count aria-hidden="true">' + cart.count + '</span>' : "") + '</a>').join("");
  const accountAction = user
    ? '<form method="post" action="/logout"><button class="signout" type="submit" aria-label="Sign out">' + icon("logout") + '<span>Sign out</span></button></form>'
    : '';
  const profile = '<details class="profile-menu"><summary class="avatar" role="button" aria-label="Open profile menu" title="' + e(user?.name || "Browsing as a guest") + '">' +
    '<span class="profile-initials">' + e(user ? user.name.split(" ").map(part => part[0]).join("") : "?") + '</span>' +
    '<span class="menu-control-label">' + e(user?.name || "Guest account") + '</span></summary><div class="profile-panel">' +
    '<strong>' + e(user?.name || "Welcome to Fieldwork") + '</strong><span>' + e(user ? roleName(user.role) : "Browsing as a guest") + '</span>' +
    (admin ? '<a href="/admin">' + icon("admin") + 'Store management</a>' : '<a href="/cart">' + icon("checkout") + 'View cart</a>') + (user ? (admin ? '' : '<a href="/orders">' + icon("orders") + 'My orders</a>') +
    '<form method="post" action="/logout"><button type="submit">' + icon("logout") + 'Log out</button></form>' :
    '<a href="/login">' + icon("logout") + 'Sign in / Sign up</a>') + '</div></details>';
  return document(title,
    '<div class="app-shell"><aside class="sidebar"><a class="brand" href="' + home + '" aria-label="Fieldwork home">' + logo() + '</a>' +
    '<button type="button" class="sidebar-toggle icon-button" data-sidebar-toggle aria-label="Collapse sidebar" aria-expanded="true" aria-controls="main-navigation">' +
    '<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-11-3 3 3 3"/></svg></button>' +
    '<p class="nav-label">' + (admin ? 'STORE MANAGEMENT' : 'YOUR WORKSPACE') + '</p><nav id="main-navigation" aria-label="Main navigation">' + navigation + '</nav>' +
    '<div class="sidebar-footer"><div class="demo-note"><span class="status-dot"></span><span>' + (admin ? 'Store administration' : 'Demo storefront') + '</span></div>' +
    '<p>' + (admin ? 'Catalogue, orders and customers.' : 'A small shop. A little inspiration.') + '</p>' + accountAction + '</div></aside>' +
    '<div class="workspace"><header class="topbar"><a class="brand mobile-brand" href="' + home + '" aria-label="Fieldwork home">' + logo() + '</a>' +
    '<div class="breadcrumb"><a href="' + home + '">' + (admin ? 'Management' : 'Fieldwork') + '</a><span>/</span><strong>' + e(title) + '</strong></div>' +
    (!user ? '<a class="button header-sign-in" href="/login">Sign in / Sign up</a>' : '') +
    '<div class="account-bar" data-account="' + (user ? 'member' : 'guest') + '"><p class="menu-section-label">ACCOUNT</p>' +
    (admin ? '' : '<a class="header-cart" href="/cart" aria-label="Open cart">' + icon("checkout") + '<span data-cart-count>' + cart.count + '</span></a>') + themeButton() +
    '<span class="role-badge">' + e(user ? roleName(user.role) : "Guest") + '</span>' + (admin ? '' : '<div class="credit"><span>Demo credit</span><strong>' +
    (balance === null ? '&mdash;' : money(balance)) + '</strong></div>') + profile + '</div>' +
    '<button type="button" class="mobile-menu-toggle icon-button" data-mobile-menu aria-label="Open menu" aria-expanded="false" aria-controls="mobile-navigation">' +
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></header>' +
    (labControls ? labTools({ admin }) : '') + '<main id="main-content" class="main">' + bugBanners(bugs) + body + '</main>' +
    '<footer class="page-footer"><span>Fieldwork &copy; 2026</span><span>' + (admin ? 'Demo management only' : 'Demo purchases only') + ' &middot; ' +
    e(now.toISOString().slice(0, 10)) + ' UTC</span></footer></div></div>' +
    '<dialog id="mobile-navigation" class="mobile-navigation" aria-label="Navigation and account"><button type="button" class="icon-button mobile-menu-close" data-mobile-close aria-label="Close menu">&times;</button></dialog>' +
    (labControls ? labDialogs() : ''), admin ? "admin-body" : "", labControls);
}
export function loginPage(error = "", email = "", bugs = {}, labControls = false, next = "/products", options = {}) {
  const registering = options.signup === true;
  const accounts = [["customer", "Customer"], ["admin", "Admin"]];
  const nextQuery = "?next=" + encodeURIComponent(next);
  return document(registering ? "Create account" : "Sign in",
    '<div class="login-tools"><a class="lab-return" href="/products">Back to shop</a>' + themeButton() + '</div>' + (labControls ? labTools() : '') +
    '<main id="main-content" class="login-layout"><section class="login-story"><a class="brand" href="/login">' + logo() + '</a>' +
    '<div class="story-copy"><span class="eyebrow light">A LITTLE MORE INTENTIONAL</span><h1>Good things.<br/>For your everyday.</h1>' +
    '<p>A considered collection for work, home, and the moments in between.</p><div class="story-art story-photo">' +
    collectionPhoto("(max-width: 560px) 90vw, 45vw") + '</div></div><p class="story-footer">Thoughtfully simple, from start to checkout.</p></section>' +
    '<section class="login-form-section"><div class="login-card"><span class="eyebrow">WELCOME TO FIELDWORK</span><h2>' + (registering ? 'Your own little corner.' : 'Make yourself at home.') + '</h2>' +
    '<p class="muted">' + (registering ? 'Create a customer account. Start with $1,000 demo credit.' : 'Sign in to explore the collection.') + '</p>' + bugBanners(bugs) +
    (error ? '<div class="alert error" id="auth-error" role="alert">' + e(error) + '</div>' : "") +
    '<form method="post" action="/' + (registering ? 'signup' : 'login') + '" class="login-form"' + (error ? ' aria-describedby="auth-error"' : '') + '><input type="hidden" name="next" value="' + e(next) + '"/>' +
    (registering ? '<label for="name">Display name</label><input id="name" name="name" autocomplete="nickname" required maxlength="80" value="' + e(options.name || '') + '"/>' : '') +
    '<label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254" value="' + e(email) + '" placeholder="you@example.test"/>' +
    '<label for="password">Password' + (registering ? ' <span class="muted">(at least 8 characters)</span>' : '') + '</label><input id="password" name="password" type="password" autocomplete="' + (registering ? 'new-password' : 'current-password') + '" required maxlength="256"' + (registering ? ' minlength="8"' : '') + '/>' +
    (registering ? '<label for="password-confirmation">Confirm password</label><input id="password-confirmation" name="password_confirmation" type="password" autocomplete="new-password" required minlength="8" maxlength="256"/>' : '') +
    '<button class="button primary full" type="submit">' + (registering ? 'Create account' : 'Sign in') + ' ' + icon("arrow") + '</button></form>' +
    '<p class="auth-switch">' + (registering ? 'Already have an account? <a href="/login' + nextQuery + '">Sign in</a>' : 'New here? <a href="/signup' + nextQuery + '">Create account</a>') + '</p>' +
    (registering ? '<p class="signup-note">Use fictional details. In the interactive demo, reset or sandbox expiry clears this account.</p>' :
    '<div class="demo-accounts"><span class="eyebrow">TRY A DEMO ACCOUNT</span><p>Choose a role to fill in its sign-in details.</p><div class="role-options">' +
    accounts.map(([key, name]) => '<button type="button" class="role-choice" data-demo-role="' + key + '">' + name + '</button>').join("") +
    '</div><p class="login-disclaimer">Fictional accounts and purchases. No payment information needed.</p></div>') + '</div></section></main>' + (labControls ? labDialogs() : ''), "login-body" + (registering ? " signup-body" : ""), labControls);
}
export function artwork(name, { size = "card", eager = false } = {}) {
  const photos = {
    journal: "Sage linen Everyday journal with a wooden pencil",
    headphones: "Forest-green Studio headphones with cushioned earcups",
    mug: "Terracotta Ceramic mug with a rounded handle",
    lamp: "Sage-green Arc desk lamp with a conical shade"
  };
  const key = Object.hasOwn(photos, name) ? name : "journal";
  const sizes = size === "thumb" ? "100px" : size === "detail" ? "(max-width: 850px) 90vw, 540px" : "(max-width: 560px) 44vw, (max-width: 1200px) 35vw, 280px";
  return '<img class="product-art" src="/images/' + key + '-640.webp" srcset="' +
    [320, 640, 1280].map(width => '/images/' + key + '-' + width + '.webp ' + width + 'w').join(', ') +
    '" sizes="' + sizes + '" width="1280" height="1280" alt="' + photos[key] +
    '" loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async"' + (eager ? ' fetchpriority="high"' : '') + '/>';
}
function collectionPhoto(sizes) {
  return '<img class="collection-photo" src="/images/collection-hero-1280.webp" ' +
    'srcset="/images/collection-hero-640.webp 640w, /images/collection-hero-1280.webp 1280w, /images/collection-hero-1920.webp 1920w" ' +
    'sizes="' + sizes + '" width="1920" height="1288" alt="Fieldwork journal, headphones, mug and desk lamp on a sunlit stone desk" loading="eager" fetchpriority="high" decoding="async"/>';
}
function heading(eyebrow, title, description, extra = "") {
  return '<div class="page-heading"><div><span class="eyebrow">' + e(eyebrow) + '</span><h1>' + e(title) +
    '</h1><p class="muted">' + e(description) + '</p></div>' + extra + '</div>';
}
function addToCartForm(product, { quantity = false, offer = null, label = "Add to cart", quick = false } = {}) {
  return '<form method="post" action="/cart/items" data-cart-form data-cart-api="/api/cart/items" class="' + (quick ? 'quick-add' : 'product-purchase') + '">' +
    '<input type="hidden" name="product_id" value="' + product.id + '"/>' +
    (offer ? '<input type="hidden" name="offer_id" value="' + offer.id + '"/>' : '') +
    (quantity ? '<label class="quantity-label" for="product-quantity">Quantity</label><div class="quantity-control"><button type="button" data-quantity-step="-1" aria-label="Decrease quantity">&minus;</button>' +
      '<input id="product-quantity" name="quantity" type="number" min="1" max="99" step="1" value="1" aria-label="Quantity" required/>' +
      '<button type="button" data-quantity-step="1" aria-label="Increase quantity">+</button></div>' : '<input type="hidden" name="quantity" value="1"/>') +
    '<button type="submit" class="button primary"' + (quick ? ' aria-label="Add ' + e(product.name) + ' to cart"' : '') + '>' +
    icon("checkout") + '<span>' + e(label) + '</span></button></form>';
}

function productCards(products) {
  return '<div class="product-grid">' + products.map((product, index) =>
    '<article class="product-card" style="--card-index:' + index + '"><a class="art-panel art-' + e(product.artwork) + '" href="/products/' + product.id +
    '" aria-label="Preview ' + e(product.name) + '">' + artwork(product.artwork) + '<span class="product-category">' + e(product.category) +
    '</span><span class="product-peek" aria-hidden="true">Take a closer look ' + icon("arrow") + '</span></a><div class="product-details">' +
    '<a href="/products/' + product.id + '"><h3>' + e(product.name) + '</h3></a><p>' + e(product.description) + '</p>' +
    '<div class="product-bottom"><strong>' + money(product.price_cents) + '</strong><a class="add-button" href="/products/' + product.id +
    '" aria-label="View ' + e(product.name) + '">' + icon("arrow") + '</a></div>' + addToCartForm(product, { quick: true }) + '</div></article>').join("") + '</div>';
}

function beetle() {
  return '<svg class="lab-beetle" viewBox="0 0 160 180" fill="none" aria-hidden="true">' +
    '<g class="beetle-legs" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="m52 69-24-16-10 9m33 31-30 4-9 17m42 8-23 26 3 15m74-94 24-16 10 9m-33 31 30 4 9 17m-42 8 23 26-3 15"/>' +
    '<path d="m67 39-8-22m34 22 8-22"/></g><ellipse cx="80" cy="98" rx="43" ry="57" fill="currentColor"/>' +
    '<path d="M80 52v98M43 80q37-22 74 0" stroke="var(--bug-shell-line)" stroke-width="3"/>' +
    '<ellipse cx="80" cy="43" rx="25" ry="20" fill="currentColor"/><circle cx="70" cy="40" r="5" fill="var(--bug-eye)"/>' +
    '<circle cx="90" cy="40" r="5" fill="var(--bug-eye)"/><path d="m68 107 9 9 17-21" class="beetle-tick" stroke="var(--bug-eye)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function bugHunt() {
  return '<button type="button" id="roaming-bug" class="roaming-bug" aria-label="Catch the roaming bug" title="Catch me if you can">' + beetle() + '</button>' +
    '<button type="button" id="pause-bug" class="bug-pause" aria-label="Pause roaming bug" title="Pause roaming bug" aria-pressed="false">' +
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path class="pause-mark" d="M8 5v14m8-14v14"/><path class="play-mark" d="m8 5 10 7-10 7V5Z"/></svg></button>' +
    '<dialog id="bug-surprise" class="bug-surprise is-caught" aria-labelledby="surprise-heading" aria-describedby="bug-result"><form method="dialog"><button class="icon-button surprise-close" aria-label="Close bug surprise">&times;</button></form>' +
    '<div id="bug-leap" class="bug-leap" aria-hidden="true" hidden>' + beetle() + '</div><div class="surprise-stage">' + beetle() + '<span class="bug-fixed-mark" aria-hidden="true">&#10003;</span></div>' +
    '<div class="surprise-content"><span class="eyebrow" id="bug-caption">NICE CATCH</span><h2 id="surprise-heading">You caught the bug!</h2>' +
    '<p id="bug-result">A tiny bug. A very big entrance. What happens next?</p><div class="surprise-actions"><button type="button" class="button secondary" id="release-bug" autofocus>Let it roam</button>' +
    '<button type="button" class="button primary" id="fix-bug">Fix it</button><form method="dialog" id="bug-done" hidden><button class="button primary">Done</button></form></div>' +
    '<p class="surprise-note">Just a playful stowaway. QA playground switches stay as you set them.</p></div></dialog>';
}

export function landingPage(user) {
  const repo = "https://github.com/Akshat14092003/release-verification-lab";
  const admin = user?.role === "admin";
  const destination = admin ? "/admin" : "/products";
  return document("Release Verification Lab", '<a class="skip-link" href="#main-content">Skip to content</a>' +
    '<header class="home-header"><a class="brand" href="/" aria-label="Fieldwork home">' + logo() + '</a>' +
    '<nav aria-label="Main navigation"><a href="/" aria-current="page">Home</a><a href="' + destination + '">' + (admin ? 'Admin' : 'Shop') + '</a><a href="#about-lab">About the lab</a></nav>' +
    '<div class="home-account"><a class="button secondary" href="' + (user ? destination : '/login') + '">' + (admin ? 'Manage shop' : user ? 'Open shop' : 'Sign in / Sign up') + '</a>' + themeButton() + '</div></header>' +
    '<main id="main-content" class="home-main" tabindex="-1"><section class="store-hero home-hero"><div class="hero-copy"><span class="eyebrow">FIELDWORK / RELEASE VERIFICATION LAB</span>' +
    '<h1>A little shopping.<br/><em>A little bug hunting.</em></h1><p>A working demo shop with a twist. Introduce realistic bugs, run automated checks, and see the evidence for yourself.</p>' +
    '<div class="hero-actions"><a class="button primary" href="' + destination + '">' + (admin ? 'Open dashboard ' : 'Enter the shop ') + icon("arrow") + '</a><a class="text-link" href="#how-it-works">How it works ' + icon("arrow") + '</a></div>' +
    '<span class="hero-note">Fictional credit. Real tests. A sandbox of your own.</span></div><div class="hero-scene hero-photo-scene"><div class="hero-photo">' +
    collectionPhoto("(max-width: 850px) 94vw, 48vw") + '<span class="floating-label label-demo"><span class="status-dot"></span> Real shopping. Demo credit.</span></div>' +
    '<span class="orbit-dot dot-one"></span><span class="orbit-dot dot-two"></span></div></section>' +
    '<div class="home-proof"><span>4 intentional bugs</span><span>' + BASELINE_CHECKS + ' release checks</span><span>Browser · API · Database · Security</span></div>' +
    '<section id="how-it-works" class="home-section"><div class="section-intro"><span class="eyebrow">YOUR FIRST BUG HUNT</span><h2>Break it. Catch it.<br/>Make it right.</h2><p>Follow the steps in the shop. Every switch changes actual behavior; every result comes from a real test.</p></div>' +
    '<ol class="home-steps">' + [
      ["Shop", "Build a cart and checkout with $1,000 in fictional credit. No card details needed."],
      ["Enable a bug", "Open QA playground and choose a rule to break. Each switch explains what to try."],
      ["Run checks", "Watch actual browser, API, database, and security checks report their results."],
      ["Inspect the evidence", "Open a failed check, read its error and trace, then turn the bug off and verify the fix."]
    ].map(([title, copy], index) => '<li><span class="step-number">0' + (index + 1) + '</span><div><h3>' + title + '</h3><p>' + copy + '</p></div></li>').join("") + '</ol></section>' +
    '<section id="about-lab" class="home-section home-about"><div class="section-intro"><span class="eyebrow">MORE THAN A SHOP</span><h2>A small release.<br/>Evidence at every layer.</h2><p>This is a QA portfolio project built with Express, SQLite, and Playwright. You can reproduce the bugs manually and see which checks catch them.</p></div>' +
    '<div class="layer-list">' + [
      ["Browser", "Real shopping journeys, screenshots, and traces."], ["API", "Login rules, ownership, pricing, and purchase limits."],
      ["Database", "Order totals checked against independent SQL and ledger sums."], ["Security", "Focused SQL-like input and reflected/stored script probes."]
    ].map(([title, copy]) => '<div><h3>' + title + '</h3><p>' + copy + '</p></div>').join("") + '</div></section>' +
    '<section class="home-evidence"><div><span class="eyebrow">SEE HOW IT IS BUILT</span><h2>Every result has a paper trail.</h2><p>Explore the source or browse the latest published CI reports.</p></div>' +
    '<div><a class="button secondary" href="' + repo + '">View source ' + icon("arrow") + '</a><a class="text-link" href="https://akshat14092003.github.io/release-verification-lab/">Browse test reports ' + icon("arrow") + '</a></div></section></main>' +
    '<footer class="home-footer"><a class="brand" href="/">' + logo() + '</a><p>A synthetic shop. An actual bug hunt.</p></footer>', "landing-body" + (admin ? " admin-body" : ""));
}

export function productsPage(products, query = "", category = "") {
  const categories = ["Stationery", "Audio", "Home", "Lighting"];
  return '<section id="collection" class="catalogue"><div class="section-toolbar"><div><span class="eyebrow">THE COLLECTION</span><h1>Products</h1><p class="muted">Useful things. Yours to put to the test.</p></div>' +
    '<form action="/products" method="get" class="search-box"><label class="sr-only" for="search">Search products</label>' + icon("search") +
    '<input id="search" name="q" type="search" maxlength="100" value="' + e(query) + '" placeholder="Search the collection"/>' +
    '<button type="submit" class="sr-only">Search</button></form></div><div class="category-filters" aria-label="Product categories">' +
    '<a href="/products" class="filter-chip ' + (!category ? 'selected' : '') + '">All finds</a>' +
    categories.map(name => '<a href="/products?category=' + encodeURIComponent(name) + '" class="filter-chip ' + (category === name ? 'selected' : '') + '">' + e(name) + '</a>').join("") + '</div>' +
    (products.length ? productCards(products) : '<div class="empty-state"><h2>No matching products</h2><p>Try another search or browse the full collection.</p>' +
    '<a href="/products" class="button secondary">View all products</a></div>') + '</section>' +
    '<div class="store-promises"><span>' + icon("check") + ' Server-verified prices</span><span>' + icon("checkout") + ' Your own shopping cart</span>' +
    '<span>' + icon("admin") + ' Fictional credit, real checks</span></div>';
}

export function productPage(product, related) {
  return '<a class="text-link back-link" href="/products">&larr; Back to the collection</a><section class="product-detail">' +
    '<div class="product-gallery art-' + e(product.artwork) + '"><span class="product-category">' + e(product.category) + '</span>' + artwork(product.artwork, { size: "detail", eager: true }) +
    '<span class="gallery-caption">The little things, considered.</span></div><div class="product-info"><span class="eyebrow">' + e(product.category) +
    '</span><h1>' + e(product.name) + '</h1><p class="product-description">' + e(product.description) + '</p><strong class="detail-price">' +
    money(product.price_cents) + '</strong><p class="detail-price-note">Per item ? paid with demo credit</p>' + addToCartForm(product, { quantity: true }) +
    '<div class="detail-notes"><p>' + icon("check") + ' Add more than one item to build your own order.</p><p>' + icon("admin") +
    ' No card details or real payments.</p></div><details class="product-details-note"><summary>A little more about this demo</summary>' +
    '<p>This product is part of the synthetic Fieldwork catalogue. The server sets its price, records each purchase, and reconciles your order with its ledger.</p></details></div></section>' +
    '<section class="related-products"><div class="section-toolbar"><h2>A few things to go with it</h2><a class="subtle-link" href="/products">All finds ' +
    icon("arrow") + '</a></div>' + productCards(related) + '</section>';
}

export function cartPage(cart) {
  const title = heading("YOUR GOOD FINDS", "Your cart.", cart.count ? cart.count + ' item' + (cart.count === 1 ? '' : 's') + ' picked. Ready when you are.' : 'A little room for your next good find.');
  if (!cart.items.length) return title + '<div class="empty-state empty-cart">' + icon("checkout") + '<h2>Your cart is waiting.</h2>' +
    '<p>Explore the collection and add something you like.</p><a class="button primary" href="/products">Find your first item ' + icon("arrow") + '</a></div>';
  return title + '<div class="checkout-grid"><section class="panel cart-lines">' + cart.items.map(line =>
    '<article class="cart-line" data-cart-line="' + line.product.id + '"><a class="cart-art art-' + e(line.product.artwork) + '" href="/products/' + line.product.id +
    '" aria-label="View ' + e(line.product.name) + '">' + artwork(line.product.artwork, { size: "thumb" }) + '</a><div class="cart-line-info"><span class="eyebrow">' +
    e(line.product.category) + '</span><h2><a href="/products/' + line.product.id + '">' + e(line.product.name) + '</a></h2><p class="muted">' + money(line.unit_price_cents) +
    ' each' + (line.offer ? ' ? ' + e(line.offer.name) : '') + '</p><div class="cart-line-actions"><form method="post" action="/cart/items/' + line.product.id +
    '" data-cart-form data-cart-update data-cart-api="/api/cart/items/' + line.product.id + '"><label class="sr-only" for="cart-quantity-' + line.product.id + '">Quantity for ' + e(line.product.name) +
    '</label><div class="quantity-control"><button type="button" data-quantity-step="-1" data-auto-submit aria-label="Decrease ' + e(line.product.name) + ' quantity"' + (line.quantity === 1 ? ' disabled' : '') +
    '>&minus;</button><input id="cart-quantity-' + line.product.id + '" type="number" name="quantity" min="1" max="' + (line.offer ? '1' : '99') + '" value="' + line.quantity +
    '" required/><button type="button" data-quantity-step="1" data-auto-submit aria-label="Increase ' + e(line.product.name) + ' quantity"' + (line.offer || line.quantity === 99 ? ' disabled' : '') +
    '>+</button></div><button type="submit" class="subtle-button">Update</button></form><form method="post" action="/cart/remove/' + line.product.id +
    '" data-cart-form data-cart-update data-cart-method="DELETE" data-cart-api="/api/cart/items/' + line.product.id + '">' +
    '<button type="submit" class="subtle-button" aria-label="Remove ' + e(line.product.name) + '">Remove</button></form></div></div><strong class="cart-line-total">' +
    money(line.total_cents) + '</strong></article>').join("") + '<a class="text-link" href="/products">&larr; Continue exploring</a></section>' +
    '<aside class="panel order-summary"><h2>Your order, so far.</h2><dl><div><dt>Subtotal</dt><dd data-cart-subtotal>' + money(cart.total_cents) + '</dd></div>' +
    '<div><dt>Delivery</dt><dd class="green-text">Free</dd></div><div class="summary-total"><dt>Total</dt><dd data-testid="cart-total">' + money(cart.total_cents) +
    '</dd></div></dl><a class="button primary full" href="/checkout">Proceed to checkout ' + icon("arrow") + '</a>' +
    '<p class="summary-note">Review before you buy. Demo credit only.</p></aside></div>';
}
export function offersPage(offers) {
  return heading("A LITTLE SOMETHING EXTRA", "The weekend edit.", "Small offers, thoughtfully timed. All offer windows use UTC.") +
    offers.map(offer => '<article class="offer-card"><div class="offer-art">' + artwork(offer.artwork, { size: "detail", eager: true }) +
      '</div><div class="offer-copy"><span class="pill ' + (offer.available ? "success" : "neutral") + '">' +
      (offer.available ? "Available this weekend" : "Currently unavailable") + '</span><h2>' + e(offer.name) + '</h2><h3>' +
      e(offer.product_name) + '</h3><p class="muted">' + e(offer.description) + '</p><div class="offer-price"><strong>' +
      money(offer.price_cents) + '</strong><s>' + money(offer.regular_price_cents) + '</s><span class="pill success">Save ' +
      money(offer.regular_price_cents - offer.price_cents) + '</span></div><p class="offer-rule">' + icon("clock") + e(offer.reason) +
      '</p>' + (offer.available ? addToCartForm({ id: offer.product_id, name: offer.product_name }, { offer, label: "Add offer to cart" })
      : '<button class="button secondary" disabled>Offer unavailable</button>') + '</div></article>').join("");
}
export function checkoutPage(quote) {
  const title = heading("ONE LAST LOOK", "Your checkout.", "Review your cart and confirm your demo purchase.");
  if (!quote) return title + '<div class="empty-state">' + icon("checkout") + '<h2>Your cart is empty.</h2><p>Add something from the collection before checking out.</p>' +
    '<a href="/products" class="button primary">Explore products ' + icon("arrow") + '</a></div>';
  return title + '<div class="checkout-grid"><section class="panel"><div class="panel-heading"><h2>Your items</h2><a href="/cart" class="subtle-link">Edit cart</a></div>' +
    quote.items.map(line => '<div class="checkout-item"><div class="mini-art art-' + e(line.product.artwork) + '">' + artwork(line.product.artwork, { size: "thumb" }) +
      '</div><div><span class="eyebrow">' + e(line.product.category) + '</span><h3>' + e(line.product.name) + '</h3><p class="muted">Quantity: ' + line.quantity +
      '</p>' + (line.offer ? '<span class="pill success">' + e(line.offer.name) + '</span>' : '') + '</div><strong>' + money(line.total_cents) + '</strong></div>').join("") +
    '<div class="payment-note">' + icon("admin") + '<div><strong>Paid with your demo credit</strong><p>No payment details needed. Each item is recorded in the ledger.</p></div></div></section>' +
    '<aside class="panel order-summary"><h2>Order summary</h2><dl><div><dt>Subtotal</dt><dd>' + money(quote.total_cents) + '</dd></div>' +
    '<div><dt>Delivery</dt><dd class="green-text">Free</dd></div><div class="summary-total"><dt>Total</dt><dd data-testid="checkout-total" data-cents="' + quote.total_cents + '">' +
    money(quote.total_cents) + '</dd></div></dl><form method="post" action="/checkout"><button class="button primary full" type="submit">Place demo order ' + icon("arrow") +
    '</button></form><p class="summary-note">Available demo credit: ' + money(quote.balance_cents) + '</p></aside></div>';
}
function orderTable(orders, all = false, { editable = true, filters = {} } = {}) {
  if (!orders.length) return '<div class="empty-state"><h2>No orders yet</h2><p>' + (all ? 'Customer purchases will appear here.' : 'Your first good find is just around the corner.') + '</p>' +
    (all ? '' : '<a class="button primary" href="/products">Browse products</a>') + '</div>';
  return '<div class="table-scroll"><table><thead><tr><th>Order</th>' + (all ? '<th>Customer</th>' : "") +
    '<th>Date (UTC)</th><th>Status</th><th class="align-right">Total</th><th><span class="sr-only">Details</span></th></tr></thead><tbody>' +
    orders.map(order => '<tr><td><strong>#FW-' + order.id + '</strong></td>' + (all ? '<td>' + e(order.customer_name) + '</td>' : "") +
    '<td>' + e(dateLabel(order.created_at)) + '</td><td>' + (all && editable ? '<form method="post" action="/admin/orders/' + order.id + '/status" class="order-status-form"><label class="sr-only" for="order-status-' + order.id + '">Status for order FW-' + order.id + '</label><select id="order-status-' + order.id + '" name="status">' +
      ORDER_STATUSES.map(status => '<option value="' + status + '"' + (order.status === status ? ' selected' : '') + '>' + status[0].toUpperCase() + status.slice(1) + '</option>').join('') + '</select><input type="hidden" name="filter_status" value="' + e(filters.status) + '"/><input type="hidden" name="filter_customer" value="' + e(filters.customer) + '"/><button type="submit" class="button secondary" aria-label="Update order FW-' + order.id + '">Update</button></form>' :
      '<span class="pill neutral">' + e(order.status[0].toUpperCase() + order.status.slice(1)) + '</span>') + '</td>' +
    '<td class="align-right">' + money(order.total_cents) + '</td><td><a class="subtle-link" href="' + (all ? '/admin/orders/' : '/orders/') + order.id + '">View order ' +
    icon("arrow") + '</a></td></tr>').join("") + '</tbody></table></div>';
}
export function ordersPage(orders) {
  return heading("YOUR GOOD FINDS", "Order history.", "Everything you have picked up, all in one place.") +
    '<section class="panel table-panel">' + orderTable(orders) + '</section>';
}
export function receiptPage(order, bugs = {}, { admin = false, customer } = {}) {
  // Seeded presentation defect: the summary reuses the first line-item total
  // instead of the complete order. The stored order and ledger stay correct.
  const firstItem = order.items[0];
  const displayedTotal = bugs.BUG_TOTAL_MISMATCH
    ? (firstItem?.unit_price_cents || 0) * (firstItem?.quantity || 0)
    : order.total_cents;
  const ledgerTotal = -order.ledger.reduce((sum, entry) => sum + entry.amount_cents, 0);
  return heading(admin ? "CUSTOMER ORDER REVIEW" : "THANK YOU FOR STOPPING BY", admin ? "Order #FW-" + order.id : "A good choice.", admin ? "Review fulfilment and the recorded payment evidence." : "Your demo order is complete. Here is your receipt.",
    '<a class="button secondary" href="' + (admin ? '/admin/orders' : '/products') + '">' + (admin ? 'Back to orders ' : 'Back to the collection ') + icon("arrow") + '</a>') +
    (admin && customer ? '<p class="admin-order-customer"><strong>Customer: ' + e(customer.name) + '</strong><span>' + e(customer.email) + '</span></p>' : '') +
    '<section class="panel"><div class="panel-heading"><div><span class="eyebrow">ORDER #FW-' + order.id + '</span><h2>Order details</h2></div>' +
    '<span class="pill success">' + icon("check") + 'Paid</span><span class="pill neutral" data-testid="order-status">' + e(order.status[0].toUpperCase() + order.status.slice(1)) + '</span></div>' +
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
function bentoTile(iconName, label, value, { foot = "", classes = "" } = {}) {
  return '<section class="bento-tile ' + classes + '"><span class="bento-icon">' + icon(iconName) + '</span>' +
    '<span class="bento-label">' + e(label) + '</span><strong class="bento-figure">' + e(value) + '</strong>' +
    (foot ? '<span class="bento-foot">' + e(foot) + '</span>' : '') + '</section>';
}
function adminProductForm(product = {}, { draft = {}, editingId } = {}) {
  const key = String(product.id ?? "new");
  const values = String(editingId) === key ? { ...product, ...draft, active: draft.active === "1" } : product;
  const price = String(editingId) === key ? draft.price : product.price_cents ? (product.price_cents / 100).toFixed(2) : "";
  const options = (items, selected) => items.map(item => '<option value="' + e(item) + '"' + (selected === item ? ' selected' : '') + '>' + e(item[0].toUpperCase() + item.slice(1)) + '</option>').join('');
  return '<form method="post" action="/admin/products' + (product.id ? '/' + product.id : '') + '" class="admin-product-form" data-admin-product="' + key + '">' +
    '<label for="product-name-' + key + '">Name<input id="product-name-' + key + '" name="name" required maxlength="100" value="' + e(values.name || '') + '"/></label>' +
    '<label for="product-price-' + key + '">Price ($)<input id="product-price-' + key + '" name="price" type="number" min="0.01" max="9999.99" step="0.01" required value="' + e(price || '') + '"/></label>' +
    '<label for="product-category-' + key + '">Category<select id="product-category-' + key + '" name="category">' + options(CATEGORIES, values.category) + '</select></label>' +
    '<label for="product-artwork-' + key + '">Photo<select id="product-artwork-' + key + '" name="artwork">' + options(ARTWORK, values.artwork) + '</select></label>' +
    '<label class="admin-description" for="product-description-' + key + '">Description<textarea id="product-description-' + key + '" name="description" required maxlength="300" rows="2">' + e(values.description || '') + '</textarea></label>' +
    '<label class="admin-availability"><input type="checkbox" name="active" value="1"' + ((values.active ?? !product.id) ? ' checked' : '') + '/>Available for sale</label>' +
    '<button class="button primary" type="submit">' + (product.id ? 'Save product' : 'Add product') + '</button><p class="admin-save-feedback" data-admin-feedback role="status" aria-live="polite" hidden></p></form>';
}
export function adminProductEntry(product, options = {}) {
  return '<details class="admin-product" data-admin-product-id="' + product.id + '"' + (String(options.editingId) === String(product.id) ? ' open' : '') + '><summary><span data-product-name>' + e(product.name) + '</span><span class="muted" data-product-summary>' + money(product.price_cents) + ' · ' + (product.active ? 'For sale' : 'Hidden') + '</span></summary>' + adminProductForm(product, options) + '</details>';
}
function adminNotice(options) {
  return options.error ? '<div class="alert error" role="alert">' + e(options.error) + '</div>' : options.message ? '<div class="alert" role="status">' + e(options.message) + '</div>' : '';
}
export function adminPage({ stats, orders, products, customers }) {
  const processing = orders.filter(order => order.status === "processing").length;
  const active = products.filter(product => product.active).length;
  const task = (href, name, copy, iconName) => '<a class="admin-task" href="' + href + '"><span class="bento-icon">' + icon(iconName) + '</span><span><strong>' + e(name) + '</strong><span>' + e(copy) + '</span></span>' + icon("arrow") + '</a>';
  return heading("STORE MANAGEMENT", "Store overview.", "Track customer purchases, keep the catalogue current, and manage fulfilment.",
    '<a class="button primary" href="/admin/orders?status=processing">Review processing orders ' + icon("arrow") + '</a>') +
    '<div class="bento admin-metrics">' +
    bentoTile("check", "Recorded sales", money(stats.sales_cents), { foot: "All time · synthetic purchases · ledger total" }) +
    bentoTile("orders", "Paid orders", stats.orders, { foot: "All customer orders" }) +
    bentoTile("clock", "Processing", processing, { foot: "Awaiting fulfilment" }) +
    bentoTile("customers", "Customers", customers.length, { foot: "Customer accounts only" }) + '</div>' +
    '<section class="admin-tasks" aria-label="Management shortcuts">' +
    task("/admin/products", "Manage products", active + " for sale · " + (products.length - active) + " hidden", "products") +
    task("/admin/orders", "Manage orders", "Review receipts and update fulfilment", "orders") +
    task("/admin/customers", "View customers", "Inspect demo credit and purchase history", "customers") + '</section>' +
    '<section class="panel table-panel"><div class="panel-heading"><h2>Recent orders</h2><a class="subtle-link" href="/admin/orders">All orders ' + icon("arrow") + '</a></div>' +
    orderTable(orders.slice(0, 5), true, { editable: false }) + '</section>' +
    '<p class="admin-sandbox-note">This is your isolated demo shop. To try a purchase, sign out and use a customer account. QA playground checks use separate test data.</p>';
}
export function adminProductsPage({ products }, options = {}) {
  return heading("STORE MANAGEMENT", "Products.", "Edit prices and availability, or add a product to the catalogue.") + adminNotice(options) +
    '<section class="panel admin-catalogue" id="manage-products"><div class="panel-heading"><h2>Manage products</h2><span class="pill neutral">' + products.length + ' products</span></div>' +
    '<p class="muted">Hidden products cannot be purchased. Price changes affect future purchases; saved receipts keep their original amounts. Offer prices are separate.</p>' +
    '<details class="admin-product"' + (options.editingId === 'new' ? ' open' : '') + '><summary>Add a product</summary>' + adminProductForm({}, options) + '</details>' +
    products.map(product => adminProductEntry(product, options)).join('') + '</section>';
}
export function adminOrdersPage({ orders, customers }, options = {}) {
  const filters = options.filters || {};
  const filtered = orders.filter(order => (!filters.status || order.status === filters.status) && (!filters.customer || String(order.user_id) === filters.customer));
  const option = (value, label, selected) => '<option value="' + e(value) + '"' + (String(value) === selected ? ' selected' : '') + '>' + e(label) + '</option>';
  return heading("STORE MANAGEMENT", "Orders.", "Review customer receipts and update delivery status. Status changes keep paid amounts unchanged.") + adminNotice(options) +
    '<form class="admin-filters" method="get" action="/admin/orders"><div class="admin-filter-field"><label for="admin-order-status">Order status</label><select id="admin-order-status" name="status">' + option("", "All statuses", filters.status) +
    ORDER_STATUSES.map(status => option(status, status[0].toUpperCase() + status.slice(1), filters.status)).join('') + '</select></div>' +
    '<div class="admin-filter-field"><label for="admin-order-customer">Customer</label><select id="admin-order-customer" name="customer">' + option("", "All customers", filters.customer) +
    customers.map(customer => option(customer.id, customer.name + " · " + customer.email, filters.customer)).join('') + '</select></div><button class="button secondary" type="submit">Filter orders</button>' +
    (filters.status || filters.customer ? '<a class="subtle-link" href="/admin/orders">Clear filters</a>' : '') + '</form>' +
    '<section class="panel table-panel" id="manage-orders"><div class="panel-heading"><h2>' + (filters.status || filters.customer ? 'Filtered orders' : 'All orders') + '</h2><span class="pill neutral">Orders: ' + filtered.length + '</span></div>' +
    (!filtered.length && (filters.status || filters.customer) ? '<div class="empty-state"><h2>No orders match these filters</h2><p>Try another status or customer.</p><a class="button secondary" href="/admin/orders">Show all orders</a></div>' : orderTable(filtered, true, { filters })) + '</section>';
}
export function adminCustomersPage({ customers }) {
  return heading("STORE MANAGEMENT", "Customers.", "View customer credit and open their purchase history. Admin accounts are excluded.") +
    '<section class="panel table-panel admin-customers" id="manage-customers"><div class="panel-heading"><h2>Customer accounts</h2><span class="pill neutral">Customers: ' + customers.length + '</span></div>' +
    (customers.length ? '<div class="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Orders</th><th class="align-right">Demo credit</th><th><span class="sr-only">Purchase history</span></th></tr></thead><tbody>' +
    customers.map(customer => '<tr><td>' + e(customer.name) + '</td><td>' + e(customer.email) + '</td><td>' + customer.orders + '</td><td class="align-right">' + money(customer.balance_cents) + '</td><td><a class="subtle-link" href="/admin/orders?customer=' + customer.id + '">View orders ' + icon("arrow") + '</a></td></tr>').join('') + '</tbody></table></div>' :
    '<div class="empty-state"><h2>No customers yet</h2><p>Customer accounts appear here after they sign up.</p></div>') + '</section>';
}
export function errorPage(status, message, { admin = false } = {}) {
  return '<div class="empty-state"><span class="eyebrow">' + status + '</span><h1>' + e(message) +
    '</h1><a class="button secondary" href="' + (admin ? '/admin' : '/products') + '">' + (admin ? 'Return to management' : 'Return to products') + '</a></div>';
}
import { labDialogs, labTools } from "./lab-view.js";
import { ARTWORK, CATEGORIES, ORDER_STATUSES } from "./admin.js";
import { BASELINE_CHECKS } from "./defects.js";
