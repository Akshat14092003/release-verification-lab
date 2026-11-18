import { frontendTags } from "./assets.js";
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
    frontendTags(labControls) + '</head>' +
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

export function shell({ title, active, user, balance, now, body, bugs = {}, labControls = false, cart = { count: 0 }, revision = 0, storeId = "", sharedShop = false }) {
  const admin = user?.role === "admin";
  const home = admin ? "/admin" : "/";
  const navigation = (admin ? [["admin", "Overview", "/admin"], ["products", "Products", "/admin/products"], ["orders", "Orders", "/admin/orders"], ["customers", "Customers", "/admin/customers"]]
    : [["home", "Home", "/"], ["products", "Products"], ["offers", "Offers"], ["cart", "Cart"], ["checkout", "Checkout"], ["orders", "Orders"]])
    .map(([key, label, href]) => '<a class="nav-link ' + (key === active ? "active" : "") + '" href="' + (href || '/' + key) + '" aria-label="' + label + '" title="' + label + '"' +
      (key === active ? ' aria-current="page"' : "") + '>' + icon(key === "cart" ? "checkout" : key) + '<span class="nav-text">' + label + '</span>' +
      (key === "cart" ? '<span class="nav-count" data-cart-count aria-hidden="true">' + cart.count + '</span>' : "") + '</a>').join("");
  const accountAction = user
    ? '<form method="post" action="' + (admin ? '/admin/logout' : '/logout') + '"><button class="signout" type="submit" aria-label="Sign out">' + icon("logout") + '<span>Sign out</span></button></form>'
    : '';
  const profile = '<details class="profile-menu"><summary class="avatar" role="button" aria-label="Open profile menu" title="' + e(user?.name || "Browsing as a guest") + '">' +
    '<span class="profile-initials">' + e(user ? user.name.split(" ").map(part => part[0]).join("") : "?") + '</span>' +
    '<span class="menu-control-label">' + e(user?.name || "Guest account") + '</span></summary><div class="profile-panel">' +
    '<strong>' + e(user?.name || "Welcome to Fieldwork") + '</strong><span>' + e(user ? roleName(user.role) : "Browsing as a guest") + '</span>' +
    (admin ? '<a href="/admin">' + icon("admin") + 'Store management</a>' : '<a href="/cart">' + icon("checkout") + 'View cart</a>') + (user ? (admin ? '' : '<a href="/orders">' + icon("orders") + 'My orders</a>') +
    '<form method="post" action="' + (admin ? '/admin/logout' : '/logout') + '"><button type="submit">' + icon("logout") + 'Log out</button></form>' :
    '<a href="/login">' + icon("logout") + 'Sign in / Sign up</a>') + '</div></details>';
  return document(title,
    '<a class="skip-link" href="#main-content">Skip to content</a><div class="app-shell"><aside class="sidebar"><a class="brand" href="' + home + '" aria-label="Fieldwork home">' + logo() + '</a>' +
    '<button type="button" class="sidebar-toggle icon-button" data-sidebar-toggle aria-label="Collapse sidebar" aria-expanded="true" aria-controls="main-navigation">' +
    '<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-11-3 3 3 3"/></svg></button>' +
    '<p class="nav-label">' + (admin ? 'STORE MANAGEMENT' : 'YOUR WORKSPACE') + '</p><nav id="main-navigation" aria-label="Main navigation">' + navigation + '</nav>' +
    '<div class="sidebar-footer"><div class="demo-note"><span class="status-dot"></span><span>' + (admin ? 'Store administration' : 'Demo storefront') + '</span></div>' +
    '<p>' + (admin ? 'Catalogue, orders and customers.' : 'A small shop. A little inspiration.') + (labControls ? '<br/><span data-shop-reference>Shop ' + e(storeId) + '</span>' : '') + '</p>' + accountAction + '</div></aside>' +
    '<div class="workspace"><header class="topbar"><a class="brand mobile-brand" href="' + home + '" aria-label="Fieldwork home">' + logo() + '</a>' +
    '<div class="breadcrumb"><a href="' + home + '">' + (admin ? 'Management' : 'Fieldwork') + '</a><span>/</span><strong>' + e(title) + '</strong></div>' +
    (labControls ? labToolbar() : '') +
    (!user ? '<a class="button header-sign-in" href="/login">Sign in / Sign up</a>' : '') +
    '<div class="account-bar" data-account="' + (user ? 'member' : 'guest') + '"><p class="menu-section-label">ACCOUNT</p>' +
    (admin ? '' : '<a class="header-cart" href="/cart" aria-label="Open cart">' + icon("checkout") + '<span data-cart-count>' + cart.count + '</span></a>') + themeButton() +
    '<span class="role-badge">' + e(user ? roleName(user.role) : "Guest") + '</span>' + (admin ? '' : '<div class="credit"><span>Demo credit</span><strong>' +
    (balance === null ? '&mdash;' : money(balance)) + '</strong></div>') + profile + '</div>' +
    '<button type="button" class="mobile-menu-toggle icon-button" data-mobile-menu aria-label="Open menu" aria-expanded="false" aria-controls="mobile-navigation">' +
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></header>' +
    (labControls ? '<section class="mobile-qa-actions" aria-label="Release verification"><button type="button" class="button secondary" data-open-playground aria-controls="mobile-navigation">QA playground</button><button type="button" class="button primary" data-open-tests>Run checks</button></section>' + labTools({ admin, toolbar: false, sharedShop }) : '') + '<main id="main-content" class="main" data-store-revision="' + revision + '" data-store-id="' + e(storeId) + '" data-account-id="' + e(user?.id) + '" data-shared-shop="' + sharedShop + '">' + bugBanners(bugs) + body + '</main>' +
    '<footer class="page-footer"><span>Fieldwork &copy; 2026</span>' + (!admin && active === "home" ?
      '<nav class="footer-project-links" aria-label="Project resources"><a href="https://github.com/Akshat14092003/release-verification-lab">View source ' + icon("arrow") + '</a><a href="https://akshat14092003.github.io/release-verification-lab/">Published test reports ' + icon("arrow") + '</a></nav>' : '') + '<span>' + (admin ? 'Demo management only &middot; ' + e(now.toISOString().slice(0, 10)) + ' UTC' : 'A project by Akshat') + '</span></footer></div></div>' +
    '<dialog id="mobile-navigation" class="mobile-navigation" aria-label="Navigation and account"><button type="button" class="icon-button mobile-menu-close" data-mobile-close aria-label="Close menu">&times;</button></dialog>' +
    (labControls ? labDialogs({ sharedShop }) : ''), admin ? "admin-body" : "storefront-body", labControls);
}
export function loginPage(error = "", email = "", bugs = {}, labControls = false, next = "/products", options = {}) {
  const registering = options.signup === true;
  // Buyer-facing login shows customer demo accounts only; admin leaves no trace here.
  const accounts = [["customer", "Customer"], ["jamie", "Jamie"]];
  const nextQuery = "?next=" + encodeURIComponent(next);
  const body =
    '<section class="auth-page"><div class="auth-intro"><h1>' + (registering ? 'Request your demo account.' : next.startsWith('/orders') ? 'Your orders, your account.' : next === '/checkout' ? 'One step before checkout.' : 'Welcome back to Fieldwork.') + '</h1><p>' + (registering ? 'Use fictional details. An administrator reviews every new account.' : next.startsWith('/orders') ? 'Sign in to see your purchases, receipts and transaction records.' : next === '/checkout' ? 'Sign in to complete your purchase. Your cart stays with you.' : 'Sign in to shop with demo credit and explore the release lab.') + '</p><a class="text-link" href="/products">Back to the shop ' + icon("arrow") + '</a><div class="auth-assurance"><h2>Real behaviour. Fictional purchases.</h2><p>No payment details needed. Use a demo customer below, or request your own account.</p></div></div>' +
    '<section class="login-form-section"><div class="login-card"><h2>' + (registering ? 'Create an account' : 'Sign in to Fieldwork') + '</h2>' +
    '<p class="muted">' + (registering ? 'An admin must approve your signup before you can sign in. Approval adds $1,000 demo credit.' : 'Sign in to explore the collection.') + '</p>' + bugBanners(bugs) +
    (error ? '<div class="alert error" id="auth-error" role="alert">' + e(error) + '</div>' : "") +
    '<form method="post" action="/' + (registering ? 'signup' : 'login') + '" class="login-form"' + (error ? ' aria-describedby="auth-error"' : '') + '><input type="hidden" name="next" value="' + e(next) + '"/>' +
    (registering ? '<label for="name">Display name</label><input id="name" name="name" autocomplete="nickname" required maxlength="80" value="' + e(options.name || '') + '"/>' : '') +
    '<label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254" value="' + e(email) + '" placeholder="you@example.test"/>' +
    '<label for="password">Password' + (registering ? ' <span class="muted">(at least 8 characters)</span>' : '') + '</label><input id="password" name="password" type="password" autocomplete="' + (registering ? 'new-password' : 'current-password') + '" required maxlength="256"' + (registering ? ' minlength="8"' : '') + '/>' +
    (registering ? '<label for="password-confirmation">Confirm password</label><input id="password-confirmation" name="password_confirmation" type="password" autocomplete="new-password" required minlength="8" maxlength="256"/>' : '') +
    '<button class="button primary full" type="submit">' + (registering ? 'Create account' : 'Sign in') + ' ' + icon("arrow") + '</button></form>' +
    '<p class="auth-switch">' + (registering ? 'Already have an account? <a href="/login' + nextQuery + '">Sign in</a>' : 'New here? <a href="/signup' + nextQuery + '">Create account</a>') + '</p>' +
    (registering ? '<p class="signup-note">Use fictional details. Resetting the demo shop clears this account.</p>' :
    '<div class="demo-accounts"><span class="eyebrow">TRY A DEMO ACCOUNT</span><p>Choose an account to fill in its sign-in details.</p><div class="role-options">' +
    accounts.map(([key, name]) => '<button type="button" class="role-choice" data-demo-role="' + key + '">' + name + '</button>').join("") +
    '</div><p class="login-disclaimer">Fictional accounts and purchases. No payment information needed.</p></div>') + '</div></section></section>';
  return shell({ title: registering ? 'Create account' : 'Sign in', active: next === '/checkout' ? 'checkout' : next.startsWith('/orders') ? 'orders' : '', user: null, balance: null, now: options.now || new Date(), body, bugs, labControls, cart: options.cart, revision: options.revision, storeId: options.storeId, sharedShop: options.sharedShop });
}
export function adminLoginPage(error = "", email = "", next = "/admin") {
  return document("Admin sign in", '<a class="skip-link" href="#main-content">Skip to content</a><header class="admin-login-header"><a class="brand" href="/">' + logo() + '</a>' + themeButton() + '</header>' +
    '<main id="main-content" class="admin-login-main" tabindex="-1"><section class="login-card admin-login-card" aria-labelledby="admin-login-heading">' +
    '<span class="admin-login-mark" aria-hidden="true">' + icon("admin") + '</span><p class="admin-login-label">Store administration</p>' +
    '<h1 id="admin-login-heading">Admin sign in</h1><p class="muted">Manage products, orders and customer records. Use an administrator account to continue.</p>' +
    (error ? '<div class="alert error" id="auth-error" role="alert">' + e(error) + '</div>' : '') +
    '<form method="post" action="/admin/login" class="login-form"' + (error ? ' aria-describedby="auth-error"' : '') + '>' +
    '<input type="hidden" name="next" value="' + e(next) + '"/>' +
    '<label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254" value="' + e(email) + '" placeholder="admin@example.test"/>' +
    '<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"/>' +
    '<button class="button primary full" type="submit">Sign in ' + icon("arrow") + '</button></form>' +
    '<div class="admin-login-demo"><button type="button" class="button secondary" data-demo-role="admin">Use demo admin</button>' +
    '<p class="muted">Explore management with the demo administrator account.</p></div>' +
    '<a class="text-link" href="/products">Return to shop ' + icon("arrow") + '</a></section></main>', "admin-login-body admin-body");
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
  return '<picture class="themed-photo"><source data-dark-photo media="(prefers-color-scheme: dark)" srcset="' +
    [320, 640, 1280].map(width => '/images/' + key + '-dark-' + width + '.webp ' + width + 'w').join(', ') + '" sizes="' + sizes + '"/>' +
    '<img class="product-art" src="/images/' + key + '-640.webp" srcset="' +
    [320, 640, 1280].map(width => '/images/' + key + '-' + width + '.webp ' + width + 'w').join(', ') +
    '" sizes="' + sizes + '" width="1280" height="1280" alt="' + photos[key] +
    '" loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async"' + (eager ? ' fetchpriority="high"' : '') + '/></picture>';
}
// The hero shares the scroll story's desk so the page reads as one continuous
// world. The hero is dark in both themes, so a single set of frames is enough.
function fieldHeroPhoto() {
  return '<picture class="themed-photo"><img class="collection-photo" src="/images/scene-hero-1920.webp" ' +
    'srcset="/images/scene-hero-1280.webp 1280w, /images/scene-hero-1920.webp 1920w, /images/scene-hero-2560.webp 2560w" ' +
    'sizes="100vw" width="2586" height="1443" alt="A walnut studio desk lit by a single lamp, with a linen notebook, pencil and mug" ' +
    'loading="eager" fetchpriority="high" decoding="async"/></picture>';
}
function collectionPhoto(sizes) {
  return '<picture class="themed-photo"><source data-dark-photo media="(prefers-color-scheme: dark)" ' +
    'srcset="/images/collection-hero-dark-640.webp 640w, /images/collection-hero-dark-1280.webp 1280w, /images/collection-hero-dark-1920.webp 1920w" sizes="' + sizes + '"/>' +
    '<img class="collection-photo" src="/images/collection-hero-1280.webp" ' +
    'srcset="/images/collection-hero-640.webp 640w, /images/collection-hero-1280.webp 1280w, /images/collection-hero-1920.webp 1920w" ' +
    'sizes="' + sizes + '" width="1920" height="1288" alt="Fieldwork journal, headphones, mug and desk lamp on a studio tabletop" loading="eager" fetchpriority="high" decoding="async"/></picture>';
}
function heading(title, description, extra = "") {
  return '<div class="page-heading"><div><h1>' + e(title) +
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
    '<article class="product-card" style="--card-index:' + index + '"><a class="art-panel art-' + e(product.artwork) + '" style="view-transition-name:product-' + product.id + '" href="/products/' + product.id +
    '" aria-label="Preview ' + e(product.name) + '">' + artwork(product.artwork) + '<span class="product-category">' + e(product.category) +
    '</span><span class="product-peek" aria-hidden="true">Take a closer look ' + icon("arrow") + '</span></a><div class="product-details">' +
    '<a href="/products/' + product.id + '"><h3>' + e(product.name) + '</h3></a><p>' + e(product.description) + '</p>' +
    '<div class="product-bottom"><strong>' + money(product.price_cents) + '</strong><a class="add-button" href="/products/' + product.id +
    '" aria-label="View ' + e(product.name) + '">' + icon("arrow") + '</a></div>' + addToCartForm(product, { quick: true }) + '</div></article>').join("") + '</div>';
}

function beetle() {
  const legs = ["front", "middle", "back"].flatMap((joint, index) => ["left", "right"].map((side, sideIndex) =>
    '<span class="beetle-leg leg-' + side + ' leg-' + joint + ((index + sideIndex) % 2 ? ' gait-b' : ' gait-a') + '"><i class="beetle-upper"><b class="beetle-lower"></b></i></span>')).join("");
  return '<span class="lab-beetle" aria-hidden="true"><span class="beetle-shadow"></span>' + legs +
    '<span class="beetle-body"><span class="beetle-antenna antenna-left"></span><span class="beetle-antenna antenna-right"></span>' +
    '<span class="beetle-head"><i></i><b></b></span><span class="beetle-thorax"></span><span class="beetle-shell"></span></span></span>';
}

function bugHunt() {
  return '<button type="button" id="roaming-bug" class="ambient-bug" aria-label="Meet the little bug" title="A little bug. Catch it if you like.">' + beetle() + '</button>' +
    '<dialog id="bug-surprise" class="mascot-dialog" aria-labelledby="surprise-heading"><form method="dialog"><button class="icon-button" aria-label="Close little bug">&times;</button></form>' +
    '<div class="mascot-art" aria-hidden="true">' + beetle() + '</div><h2 id="surprise-heading">You found the little bug.</h2>' +
    '<p id="bug-result">Just a playful companion. It wanders quietly around the edges and never changes your shop or test settings.</p>' +
    '<div class="mascot-actions"><button type="button" class="button secondary" id="release-bug" autofocus>Let it wander</button><button type="button" class="button primary" id="fix-bug">Fix it</button><button type="button" class="button secondary" id="pause-wandering" aria-pressed="false">Pause wandering</button><button type="button" class="button primary" id="bug-done" hidden>Done</button></div></dialog>';
}

function checkTicker() {
  // Illustrative only — a staged entrance, never a claim that real tests just ran.
  const checks = [
    "Checkout total matches the ledger",
    "Offer limit blocks a repeat purchase",
    "Login rejects a wrong password"
  ];
  return '<div class="check-ticker" data-check-ticker aria-label="Example automated checks">' +
    '<span class="eyebrow ticker-label">EXAMPLE CHECKS</span><ul class="ticker-list">' +
    checks.map((text, i) => '<li data-check style="--row:' + i + '"><span class="check-dot" aria-hidden="true"></span>' + e(text) + '</li>').join("") +
    '</ul><span class="ticker-note">Illustrative preview &middot; ' + BASELINE_CHECKS + ' automated checks run in the shop.</span></div>';
}
function experimentHome(offer, labControls) {
  return `<section class="experiment-desk field-story" aria-labelledby="experiment-title" id="guided-start">
    <div class="field-introduction">
    <div class="field-hero">
      <div class="field-hero-image">${fieldHeroPhoto()}</div>
      <header class="field-hero-copy"><h1 id="experiment-title">Good shop.<br>Bad bug.</h1><p class="field-serif">Find what should never ship.</p><p class="field-intro">A real shop. A deliberate mistake.<br>Your job: catch it before it ships.</p><a class="field-start" href="#field-experiment">Try the bug hunt ${icon("arrow")}</a><a class="field-shop" href="/products">Explore the collection ${icon("arrow")}</a></header>
      <article class="field-ticket offer-ticket" id="field-experiment" aria-label="Weekend offer experiment">
        <div class="field-ticket-head"><span>Monday / UTC</span><span>Weekend offer</span></div>
        <div class="field-ticket-product"><div>${artwork(offer.artwork,{size:"thumb",eager:true})}</div><div><h2>${e(offer.product_name)}</h2><p><strong>${money(offer.price_cents)}</strong><s>${money(offer.regular_price_cents)}</s></p><span>Saturday &amp; Sunday only</span></div></div>
        <p class="field-question">The weekend is over.<br>Should this deal still work?</p>
        <label class="field-switch" for="experiment-bug"><span><strong>Break the weekend rule</strong><small id="switch-explanation">Off - the weekday rule stays in place</small></span><input id="experiment-bug" type="checkbox" role="switch" aria-label="Weekend-rule bug"></label>
        <div class="desk-expectation" aria-live="polite"><strong id="desk-behavior-title">Expected: purchase blocked</strong><p id="desk-behavior-copy">On Monday, the offer should be unavailable. No order or charge should be created.</p></div>
        <button class="field-try button" id="attempt-purchase">Try the offer on Monday ${icon("arrow")}</button><p id="experiment-error" role="alert"></p>
        <span class="field-ticket-note">Real shop. Fictional credit. No real payment.</span>
      </article>
    </div>
    <ol class="desk-path field-path" aria-label="Experiment journey"><li aria-current="step" data-desk-step="1"><span>01</span> Set the rule</li><li data-desk-step="2"><span>02</span> Try the offer</li><li data-desk-step="3"><span>03</span> Inspect the evidence</li></ol>
    </div>
    <section class="field-scroll-story" aria-labelledby="field-story-title">
      <div class="field-backdrop" aria-hidden="true"><span class="bd-rule"></span><span class="bd-bug"></span><span class="bd-proof"></span></div>
      <div class="field-scroll-visual" aria-hidden="true"><div class="field-scroll-rail"><i></i></div><span class="field-scene-word">RULE.</span>
        <div class="rule-diagram-body"><div class="rule-calendar-head"><span>Weekend offer window</span><span>UTC</span></div><div class="rule-week"><span class="rule-monday">Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span class="rule-allowed">Sat</span><span class="rule-allowed">Sun</span></div><div class="rule-flow"><span>Monday<br><small>Purchase request</small></span>${icon("arrow")}<strong><span class="rule-gate-intact">Weekend only</span><span class="rule-gate-bypassed">Rule bypassed</span></strong></div><div class="rule-outcome"><span class="rule-gate-intact"><strong>Expected: blocked</strong><small>The offer has ended.</small></span><span class="rule-gate-bypassed"><strong>Expected: allowed incorrectly</strong><small>This is the bug to reproduce.</small></span></div></div>
        ${weekendProof()}
        <div class="field-scene-caption"><span>Scenario: Monday</span><strong>Reading the rule</strong></div>
      </div>
      <div class="field-chapters">
        <article class="field-chapter" data-field-chapter="0"><div class="field-chapter-copy"><span class="field-chapter-index">01 / The rule</span><h2 id="field-story-title">A weekend deal<br><em>has an expiry date.</em></h2><p>This journal is discounted on Saturday and Sunday. On Monday, the shop should refuse the offer and leave orders and credit unchanged.</p><a class="text-link" href="/offers">See the offer in the shop ${icon("arrow")}</a></div></article>
        <article class="field-chapter" data-field-chapter="1"><div class="field-chapter-copy"><span class="field-chapter-index">02 / The bug</span><h2>One switch.<br><em>A different outcome.</em></h2><p>The weekend-rule bug removes that protection. A deal that should have ended can slip through on Monday. Use the experiment switch above to compare the two behaviors.</p><a class="text-link" href="#field-experiment">Back to the experiment ${icon("arrow")}</a></div></article>
        <article class="field-chapter" data-field-chapter="2"><div class="field-chapter-copy"><span class="field-chapter-index">03 / The evidence</span><h2>Proof.<br><em>Not a promise.</em></h2><p>Run the actual browser, API and database checks. Read the failure, inspect its trace, then turn the bug off and verify the correct behavior.</p><button class="button primary" id="experiment-run-checks">Verify with real tests ${icon("arrow")}</button><details class="desk-details"><summary>What the checks inspect</summary><div><p><strong>Browser</strong> &mdash; Is the offer unavailable on Monday?</p><p><strong>API</strong> &mdash; Does the server refuse the purchase?</p><p><strong>Database</strong> &mdash; Do orders and credit stay unchanged?</p><p id="experiment-scope">Loading your shop settings...</p><p>Expected behavior is not a test result. Only a completed run verifies it.</p></div></details></div></article>
      </div>
    </section>
  </section>`;
}

const LAYER = { api: "API", e2e: "Browser", db: "Database", security: "Security" };
// The proof scene names the real checks this defect breaks, taken from the same
// DEFECTS table the test runner uses, so the panel cannot drift from the suite.
function weekendProof() {
  const defect = DEFECTS.find(entry => entry.id === "weekend");
  const rows = (defect?.failures || []).map(key => {
    const [project, title] = key.split("::");
    const name = title.split(" @")[0].trim();
        return { layer: LAYER[project] || project, name: name.charAt(0).toUpperCase() + name.slice(1) };
  });
  return '<div class="rule-proof"><p>These <strong>' + rows.length + '</strong> of <strong>' + BASELINE_CHECKS +
    '</strong> checks fail &mdash; exactly these, every run.</p><ul>' +
    rows.map(row => '<li><span class="proof-layer">' + e(row.layer) + '</span><span class="proof-name">' + e(row.name) + '</span></li>').join("") +
    '</ul></div>';
}
export function welcomeGate() {
  return document("Welcome", '<main class="welcome-gate"><div class="welcome-inner">' +
    '<a class="brand welcome-brand" href="/start/hunt" aria-label="Fieldwork">' + logo() + '</a>' +
    '<p class="eyebrow welcome-eyebrow">Release Verification Lab</p>' +
    '<h1>What brings you here?</h1>' +
    '<p class="welcome-sub">Pick one to start. You can switch anytime from the top bar.</p>' +
    '<div class="welcome-doors">' +
      '<a class="welcome-door" href="/start/shop"><span class="door-icon">' + icon("products") + '</span>' +
      '<h2>Browse the shop</h2><p>A real storefront. Add products and check out with fictional credit &mdash; no test controls in the way.</p>' +
      '<span class="door-go">Enter the shop ' + icon("arrow") + '</span></a>' +
      '<a class="welcome-door door-primary" href="/start/hunt"><span class="door-icon">' + icon("check") + '</span>' +
      '<h2>Try the bug hunt</h2><p>Flip on a deliberate bug, then watch real browser, API and database checks catch it.</p>' +
      '<span class="door-go">Start the hunt ' + icon("arrow") + '</span></a>' +
    '</div>' +
    '<p class="welcome-foot">Fictional shop &middot; synthetic data &middot; no real money is spent.</p>' +
    '</div></main>', "welcome-body");
}
export function landingPage(user, offer = null, labControls = false) {
  const admin = user?.role === "admin";
  const destination = admin ? "/admin" : "/products";
  return '<div class="home-main">' + (offer && labControls ? experimentHome(offer, labControls) : '<section class="home-case"><h1>Release Verification Lab</h1><p>A demo shop with deliberate bugs you can switch on, then catch with real automated checks.</p><a class="button primary" href="/products">Enter the shop</a></section>') +
    '<div class="home-entry"><p class="home-lead">New here? This is a working shop. Browse and buy with fake credit &mdash; or flip on a bug and watch the checks catch it. No sign-up, no real money.</p><a class="button primary" href="/products">Enter the shop ' + icon("arrow") + '</a></div>' +
    '<section id="how-it-works" class="home-section"><div class="section-intro"><span class="eyebrow">YOUR FIRST BUG HUNT</span><h2>Break it. Catch it.<br/>Make it right.</h2><p>Follow the steps in the shop. Every switch changes actual behavior; every result comes from a real test.</p></div>' +
    '<ol class="home-steps">' + [
      ["Shop", "Start with $1,000 in demo credit. Add products to your cart and place an order."],
      ["Enable a bug", "Open QA playground and choose a rule to break. Each switch explains what to try."],
      ["Run checks", "Watch actual browser, API, database, and security checks report their results."],
      ["Inspect the evidence", "Open a failed check, read its error and trace, then turn the bug off and verify the fix."]
    ].map(([title, copy], index) => '<li data-reveal><span class="step-number">0' + (index + 1) + '</span><div><h3>' + title + '</h3><p>' + copy + '</p></div></li>').join("") + '</ol></section>' +
    '<section id="about-lab" class="home-section home-about"><div class="section-intro"><span class="eyebrow">MORE THAN A SHOP</span><h2>A small release.<br/>Evidence at every layer.</h2><p>This is a QA portfolio project built with Express, SQLite, and Playwright. You can reproduce the bugs manually and see which checks catch them.</p></div>' +
    '<div class="layer-list">' + [
      ["Browser", "Real shopping journeys, screenshots, and traces."], ["API", "Login rules, ownership, pricing, and purchase limits."],
      ["Database", "Order totals checked against independent SQL and ledger sums."], ["Security", "Focused SQL-like input and reflected/stored script probes."]
    ].map(([title, copy]) => '<div data-reveal><h3>' + title + '</h3><p>' + copy + '</p></div>').join("") + '</div></section></div>';
}

export function productsPage(products, query = "", category = "") {
  const categories = ["Stationery", "Audio", "Home", "Lighting"];
  return '<section id="collection" class="catalogue"><div class="section-toolbar"><div><h1>Products</h1><p class="muted">Good things for the everyday.</p></div>' +
    '<form action="/products" method="get" class="search-box"><label class="sr-only" for="search">Search products</label>' + icon("search") +
    '<input id="search" name="q" type="search" maxlength="100" value="' + e(query) + '" placeholder="Search the collection"/>' +
    '<button type="submit" class="button secondary search-submit">Search</button></form></div><div class="category-filters" aria-label="Product categories">' +
    '<a href="/products" class="filter-chip ' + (!category ? 'selected' : '') + '">All finds</a>' +
    categories.map(name => '<a href="/products?category=' + encodeURIComponent(name) + '" class="filter-chip ' + (category === name ? 'selected' : '') + '">' + e(name) + '</a>').join("") + '</div>' +
    (products.length ? productCards(products) : '<div class="empty-state"><h2>No matching products</h2><p>Try another search or browse the full collection.</p>' +
    '<a href="/products" class="button secondary">View all products</a></div>') + '</section>' +
    '<div class="store-promises"><span>' + icon("check") + ' Server-verified prices</span><span>' + icon("checkout") + ' Your own shopping cart</span>' +
    '<span>' + icon("admin") + ' Fictional credit, real checks</span></div>';
}

export function productPage(product, related) {
  return '<a class="text-link back-link" href="/products">&larr; Back to the collection</a><section class="product-detail">' +
    '<div class="product-gallery art-' + e(product.artwork) + '" style="view-transition-name:product-' + product.id + '"><span class="product-category">' + e(product.category) + '</span>' + artwork(product.artwork, { size: "detail", eager: true }) +
    '</div><div class="product-info"><span class="eyebrow">' + e(product.category) +
    '</span><h1>' + e(product.name) + '</h1><p class="product-description">' + e(product.description) + '</p><strong class="detail-price">' +
    money(product.price_cents) + '</strong><p class="detail-price-note">Per item</p>' + addToCartForm(product, { quantity: true }) +
    '<div class="detail-notes"><p>' + icon("check") + ' Add more than one item to build your own order.</p><p>' + icon("admin") +
    ' No card details or real payments.</p></div><details class="product-details-note"><summary>About this demo</summary>' +
    '<p>This product is part of the synthetic Fieldwork catalogue. The server sets its price, records each purchase, and reconciles your order with its ledger.</p></details></div></section>' +
    '<section class="related-products"><div class="section-toolbar"><h2>A few things to go with it</h2><a class="subtle-link" href="/products">All finds ' +
    icon("arrow") + '</a></div>' + productCards(related) + '</section>';
}

export function cartPage(cart) {
  const title = heading("Cart", cart.count ? cart.count + ' item' + (cart.count === 1 ? '' : 's') + ' in your cart. Review quantities before checkout.' : 'Add products from the collection to get started.');
  if (!cart.items.length) return title + '<div class="empty-state empty-cart">' + icon("checkout") + '<h2>Your cart is waiting.</h2>' +
    '<p>Explore the collection and add something you like.</p><a class="button primary" href="/products">Find your first item ' + icon("arrow") + '</a></div>';
  return title + '<div class="checkout-grid"><section class="panel cart-lines">' + cart.items.map(line =>
    '<article class="cart-line" data-cart-line="' + line.product.id + '"><a class="cart-art art-' + e(line.product.artwork) + '" href="/products/' + line.product.id +
    '" aria-label="View ' + e(line.product.name) + '">' + artwork(line.product.artwork, { size: "thumb" }) + '</a><div class="cart-line-info"><span class="eyebrow">' +
    e(line.product.category) + '</span><h2><a href="/products/' + line.product.id + '">' + e(line.product.name) + '</a></h2><p class="muted">' + money(line.unit_price_cents) +
    ' each' + (line.offer ? ' ? ' + e(line.offer.name) : '') + '</p>' +
    (line.available === false ? '<span class="pill neutral" data-cart-unavailable>No longer available &middot; remove to check out</span>' : '') +
    '<div class="cart-line-actions"><form method="post" action="/cart/items/' + line.product.id +
    '" data-cart-form data-cart-update data-cart-api="/api/cart/items/' + line.product.id + '"><label class="sr-only" for="cart-quantity-' + line.product.id + '">Quantity for ' + e(line.product.name) +
    '</label><div class="quantity-control"><button type="button" data-quantity-step="-1" data-auto-submit aria-label="Decrease ' + e(line.product.name) + ' quantity"' + (line.quantity === 1 ? ' disabled' : '') +
    '>&minus;</button><input id="cart-quantity-' + line.product.id + '" type="number" name="quantity" min="1" max="' + (line.offer ? '1' : '99') + '" value="' + line.quantity +
    '" required/><button type="button" data-quantity-step="1" data-auto-submit aria-label="Increase ' + e(line.product.name) + ' quantity"' + (line.offer || line.quantity === 99 ? ' disabled' : '') +
    '>+</button></div><button type="submit" class="subtle-button">Update</button></form><form method="post" action="/cart/remove/' + line.product.id +
    '" data-cart-form data-cart-update data-cart-method="DELETE" data-cart-api="/api/cart/items/' + line.product.id + '">' +
    '<button type="submit" class="subtle-button" aria-label="Remove ' + e(line.product.name) + '">Remove</button></form></div></div><strong class="cart-line-total">' +
    money(line.total_cents) + '</strong></article>').join("") + '<a class="text-link" href="/products">&larr; Continue exploring</a></section>' +
    '<aside class="panel order-summary"><h2>Order summary</h2><dl><div><dt>Subtotal</dt><dd data-cart-subtotal>' + money(cart.total_cents) + '</dd></div>' +
    '<div><dt>Delivery</dt><dd class="green-text">Free</dd></div><div class="summary-total"><dt>Total</dt><dd data-testid="cart-total">' + money(cart.total_cents) +
    '</dd></div></dl><a class="button primary full" href="/checkout">Proceed to checkout ' + icon("arrow") + '</a></aside></div>';
}
export function offersPage(offers) {
  return heading("Weekend offers", "Offers are available on Saturday and Sunday. All offer windows use UTC.") +
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
  const title = heading("Checkout", "Review your items and confirm your order.");
  if (!quote) return title + '<div class="empty-state">' + icon("checkout") + '<h2>Your cart is empty.</h2><p>Add something from the collection before checking out.</p>' +
    '<a href="/products" class="button primary">Explore products ' + icon("arrow") + '</a></div>';
  return title + '<div class="checkout-grid"><section class="panel"><div class="panel-heading"><h2>Your items</h2><a href="/cart" class="subtle-link">Edit cart</a></div>' +
    quote.items.map(line => '<div class="checkout-item"><div class="mini-art art-' + e(line.product.artwork) + '">' + artwork(line.product.artwork, { size: "thumb" }) +
      '</div><div><span class="eyebrow">' + e(line.product.category) + '</span><h3>' + e(line.product.name) + '</h3><p class="muted">Quantity: ' + line.quantity +
      '</p>' + (line.offer ? '<span class="pill success">' + e(line.offer.name) + '</span>' : '') + '</div><strong>' + money(line.total_cents) + '</strong></div>').join("") +
    '<div class="payment-note">' + icon("admin") + '<div><strong>Paid with your demo credit</strong><p>No payment details needed. Each item is recorded in the ledger.</p></div></div></section>' +
    '<aside class="panel order-summary"><h2>Order summary</h2><dl><div><dt>Subtotal</dt><dd>' + money(quote.total_cents) + '</dd></div>' +
    '<div><dt>Delivery</dt><dd class="green-text">Free</dd></div><div class="summary-total"><dt>Total</dt><dd data-testid="checkout-total" data-cents="' + quote.total_cents + '">' +
    money(quote.total_cents) + '</dd></div></dl><form method="post" action="/checkout"><button class="button primary full" type="submit" data-busy-label="Placing order"><span class="btn-label">Place demo order</span> ' + icon("arrow") +
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
  return heading("Order history", "View past purchases and open their receipts.") +
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
  return heading(admin ? "Order #FW-" + order.id : "Order confirmed", admin ? "Review fulfilment and the recorded payment evidence." : "Your order has been placed. Review the receipt and transaction record below.",
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
    '<div class="admin-field"><label for="product-category-' + key + '">Category</label><select id="product-category-' + key + '" name="category">' + options(CATEGORIES, values.category) + '</select></div>' +
    '<div class="admin-field"><label for="product-artwork-' + key + '">Photo</label><select id="product-artwork-' + key + '" name="artwork">' + options(ARTWORK, values.artwork) + '</select></div>' +
    '<div class="admin-field admin-description"><label for="product-description-' + key + '">Description</label><textarea id="product-description-' + key + '" name="description" required maxlength="300" rows="2">' + e(values.description || '') + '</textarea></div>' +
    '<label class="admin-availability"><input type="checkbox" name="active" value="1"' + ((values.active ?? !product.id) ? ' checked' : '') + '/>Available for sale</label>' +
    '<button class="button primary" type="submit">' + (product.id ? 'Save product' : 'Add product') + '</button><p class="admin-save-feedback" data-admin-feedback role="status" aria-live="polite" hidden></p></form>';
}
export function adminProductEntry(product, options = {}) {
  return '<details class="admin-product" data-admin-product-id="' + product.id + '"' + (String(options.editingId) === String(product.id) ? ' open' : '') + '><summary><span data-product-name>' + e(product.name) + '</span><span class="muted" data-product-summary>' + money(product.price_cents) + ' · ' + (product.active ? 'For sale' : 'Hidden') + '</span></summary>' + adminProductForm(product, options) + '</details>';
}
function adminNotice(options) {
  return options.error ? '<div class="alert error" role="alert">' + e(options.error) + '</div>' : options.message ? '<div class="alert" role="status">' + e(options.message) + '</div>' : '';
}
export function adminPage({ stats, orders, products, customers }, options = {}) {
  const processing = orders.filter(order => order.status === "processing").length;
  const active = products.filter(product => product.active).length;
  const task = (href, name, copy, iconName) => '<a class="admin-task" href="' + href + '"><span class="bento-icon">' + icon(iconName) + '</span><span><strong>' + e(name) + '</strong><span>' + e(copy) + '</span></span>' + icon("arrow") + '</a>';
  return heading("Store overview", "Track customer purchases, keep the catalogue current, and manage fulfilment.",
    '<a class="button primary" href="/admin/orders?status=processing">Review processing orders ' + icon("arrow") + '</a>') +
    '<div class="bento admin-metrics">' +
    bentoTile("check", "Recorded sales", money(stats.sales_cents), { foot: "All time · synthetic purchases · ledger total" }) +
    bentoTile("orders", "Paid orders", stats.orders, { foot: "All customer orders" }) +
    bentoTile("clock", "Processing", processing, { foot: "Awaiting fulfilment" }) +
    bentoTile("customers", "Customers", customers.length, { foot: "Customer accounts only" }) + '</div>' +
    '<section class="admin-tasks" aria-label="Management shortcuts">' +
    task("/admin/products", "Manage products", active + " for sale · " + (products.length - active) + " hidden", "products") +
    task("/admin/orders", "Manage orders", "Review receipts and update fulfilment", "orders") +
    task("/admin/customers", "View customers", "Inspect demo credit and purchase history", "customers") +
    task("/admin/signup-requests", "Manage signup requests", "Approve or reject access requests", "admin") + '</section>' +
    '<section class="panel table-panel"><div class="panel-heading"><h2>Recent orders</h2><a class="subtle-link" href="/admin/orders">All orders ' + icon("arrow") + '</a></div>' +
    orderTable(orders.slice(0, 5), true, { editable: false }) + '</section>' +
    '<p class="admin-sandbox-note">' + (options.sharedShop ? 'This shop is shared across browsers. Catalogue changes reach every buyer; orders and customers appear here.' : 'This is your isolated demo shop. Open a linked buyer window from Products to test admin changes alongside a customer.') + ' QA playground checks use separate test data.</p>';
}
export function adminProductsPage({ products }, options = {}) {
  return heading("Products", "Edit prices and availability, or add a product to the catalogue.") + adminNotice(options) +
    (options.sharedShop ? '<p class="admin-sandbox-note">Shared shop: saved changes appear in every buyer browser automatically. Regular and Incognito windows use the same catalogue.</p>' : '') +
    (options.buyerWindow ? '<section class="admin-buyer-tools" aria-label="Test the buyer experience"><div><h2>Try changes as a buyer</h2><p>Separate browsers start separate shops. Use a buyer link to connect them, then check the Shop references in both sidebars match. Saved changes appear automatically.</p></div>' +
      '<div class="admin-buyer-actions"><button type="button" class="button secondary" data-buyer-window>Open buyer window</button>' +
      '<button type="button" class="subtle-button" data-copy-buyer-link>Copy link for another browser</button></div>' +
      '<p class="muted" data-buyer-link-message role="status" hidden></p><input class="buyer-link" data-buyer-link aria-label="Buyer connection link" readonly hidden/></section>' : '') +
    '<section class="panel admin-catalogue" id="manage-products"><div class="panel-heading"><h2>Manage products</h2><span class="pill neutral">' + products.length + ' products</span></div>' +
    '<p class="muted">Hidden products cannot be purchased. Price changes affect future purchases; saved receipts keep their original amounts. Offer prices are separate.</p>' +
    '<details class="admin-product"' + (options.editingId === 'new' ? ' open' : '') + '><summary>Add a product</summary>' + adminProductForm({}, options) + '</details>' +
    products.map(product => adminProductEntry(product, options)).join('') + '</section>';
}
export function adminOrdersPage({ orders, customers }, options = {}) {
  const filters = options.filters || {};
  const filtered = orders.filter(order => (!filters.status || order.status === filters.status) && (!filters.customer || String(order.user_id) === filters.customer));
  const option = (value, label, selected) => '<option value="' + e(value) + '"' + (String(value) === selected ? ' selected' : '') + '>' + e(label) + '</option>';
  return heading("Orders", "Review customer receipts and update delivery status. Status changes keep paid amounts unchanged.") + adminNotice(options) +
    '<form class="admin-filters" method="get" action="/admin/orders"><div class="admin-filter-field"><label for="admin-order-status">Order status</label><select id="admin-order-status" name="status">' + option("", "All statuses", filters.status) +
    ORDER_STATUSES.map(status => option(status, status[0].toUpperCase() + status.slice(1), filters.status)).join('') + '</select></div>' +
    '<div class="admin-filter-field"><label for="admin-order-customer">Customer</label><select id="admin-order-customer" name="customer">' + option("", "All customers", filters.customer) +
    customers.map(customer => option(customer.id, customer.name + " · " + customer.email, filters.customer)).join('') + '</select></div><button class="button secondary" type="submit">Filter orders</button>' +
    (filters.status || filters.customer ? '<a class="subtle-link" href="/admin/orders">Clear filters</a>' : '') + '</form>' +
    '<section class="panel table-panel" id="manage-orders"><div class="panel-heading"><h2>' + (filters.status || filters.customer ? 'Filtered orders' : 'All orders') + '</h2><span class="pill neutral">Orders: ' + filtered.length + '</span></div>' +
    (!filtered.length && (filters.status || filters.customer) ? '<div class="empty-state"><h2>No orders match these filters</h2><p>Try another status or customer.</p><a class="button secondary" href="/admin/orders">Show all orders</a></div>' : orderTable(filtered, true, { filters })) + '</section>';
}
export function adminCustomersPage({ customers }) {
  return heading("Customers", "View customer credit and open their purchase history. Admin accounts are excluded.") +
    '<section class="panel table-panel admin-customers" id="manage-customers"><div class="panel-heading"><h2>Customer accounts</h2><span class="pill neutral">Customers: ' + customers.length + '</span></div>' +
    (customers.length ? '<div class="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Orders</th><th class="align-right">Demo credit</th><th><span class="sr-only">Purchase history</span></th></tr></thead><tbody>' +
    customers.map(customer => '<tr><td>' + e(customer.name) + '</td><td>' + e(customer.email) + '</td><td>' + customer.orders + '</td><td class="align-right">' + money(customer.balance_cents) + '</td><td><a class="subtle-link" href="/admin/orders?customer=' + customer.id + '">View orders ' + icon("arrow") + '</a></td></tr>').join('') + '</tbody></table></div>' :
    '<div class="empty-state"><h2>No customers yet</h2><p>Customer accounts appear here after they sign up.</p></div>') + '</section>';
}
export function errorPage(status, message, { admin = false } = {}) {
  return '<div class="empty-state"><span class="eyebrow">' + status + '</span><h1>' + e(message) +
    '</h1><a class="button secondary" href="' + (admin ? '/admin' : '/products') + '">' + (admin ? 'Return to management' : 'Return to products') + '</a></div>';
}

export function signupPendingPage(name, labControls = false, next = "/products") {
  return document("Request sent",
    '<div class="login-tools"><a class="lab-return" href="/login?next=' + e(encodeURIComponent(next)) + '">Back to sign in</a>' + themeButton() + '</div>' +
    '<main id="main-content" class="login-layout"><section class="login-story"><a class="brand" href="/login?next=' + e(encodeURIComponent(next)) + '">' + logo() + '</a>' +
    '<div class="story-copy"><span class="eyebrow light">REQUEST SUBMITTED</span><h1>You\'re on the list.</h1>' +
    '<p>An admin will review your request and approve or reject it. You\'ll be able to sign in once approved.</p></div></section>' +
    '<section class="login-form-section"><div class="login-card" style="text-align:center;padding:40px 30px;">' +
    '<span style="font-size:48px">&#9993;</span><h2 style="margin:16px 0 10px;">Request received</h2>' +
    '<p class="muted">Thanks, ' + e(name) + '. Your signup request has been sent to an admin for review.</p>' +
    '<p class="muted" style="margin-top:12px">Once approved, sign in with the email and password you chose.</p>' +
    '<a class="button secondary" href="/login?next=' + e(encodeURIComponent(next)) + '" style="margin-top:24px;display:inline-flex">Back to sign in ' + icon("arrow") + '</a>' +
    '</div></section></main>', "login-body", labControls);
}

const STATUS_PILL = {
  pending:  '<span class="pill neutral">Pending</span>',
  approved: '<span class="pill success">Approved</span>',
  rejected: '<span class="pill" style="background:var(--danger-soft);color:var(--danger-ink)">Rejected</span>'
};

export function adminSignupRequestsPage(pending, reviewed) {
  const requestRow = req =>
    '<tr><td><strong>' + e(req.name) + '</strong></td><td>' + e(req.email) + '</td>' +
    '<td>' + e(dateLabel(req.requested_at)) + '</td>' +
    '<td>' + (STATUS_PILL[req.status] || req.status) + '</td>' +
    (req.status === "pending"
      ? '<td><form method="post" action="/admin/signup-requests/' + req.id + '/approve" style="display:inline">' +
        '<button class="button primary" style="font-size:11px;padding:7px 12px" type="submit">Approve</button></form> ' +
        '<form method="post" action="/admin/signup-requests/' + req.id + '/reject" style="display:inline">' +
        '<button class="button secondary" style="font-size:11px;padding:7px 12px" type="submit">Reject</button></form></td>'
      : '<td><span class="muted" style="font-size:11px">' + (req.reviewed_at ? dateLabel(req.reviewed_at) : '—') + '</span></td>'
    ) + '</tr>';

  const pendingSection = '<section class="panel table-panel" style="margin-bottom:24px">' +
    '<div class="panel-heading" style="padding:25px 26px 0"><h2>Pending requests</h2>' +
    '<span class="pill ' + (pending.length ? 'neutral' : 'success') + '">' + pending.length + ' pending</span></div>' +
    (pending.length
      ? '<div class="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' + pending.map(requestRow).join("") + '</tbody></table></div>'
      : '<div style="padding:24px 26px"><p class="muted">No pending requests.</p></div>') +
    '</section>';

  const reviewedSection = reviewed.length
    ? '<section class="panel table-panel">' +
      '<div class="panel-heading" style="padding:25px 26px 0"><h2>Reviewed</h2></div>' +
      '<div class="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Requested</th><th>Status</th><th>Reviewed</th></tr></thead>' +
      '<tbody>' + reviewed.map(requestRow).join("") + '</tbody></table></div></section>'
    : '';

  return '<div class="page-heading"><div><span class="eyebrow">USER MANAGEMENT</span>' +
    '<h1>Signup requests</h1><p class="muted">Approve or reject access requests from new users.</p></div>' +
    '<a class="button secondary" href="/admin">Back to admin ' + icon("arrow") + '</a></div>' +
    pendingSection + reviewedSection;
}

import { labDialogs, labToolbar, labTools } from "./lab-view.js";
import { ARTWORK, CATEGORIES, ORDER_STATUSES } from "./admin.js";
import { BASELINE_CHECKS, DEFECTS } from "./defects.js";
