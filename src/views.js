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
  return '<span class="brand-mark">' + icon("products") + '</span><span class="brand-wordmark">fieldwork<span class="brand-dot">.</span></span>';
}
export function themeButton() {
  return '<button type="button" class="theme-toggle" data-theme-toggle aria-label="Switch to dark mode">' +
    '<svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/>' +
    '<path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>' +
    '<svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<path d="M20 14a8.5 8.5 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/></svg></button>';
}
export function document(title, body, bodyClass = "", labControls = false) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>' +
    '<meta name="description" content="Fieldwork is a fictional shop in the Release Verification Lab."/>' +
    '<title>' + e(title) + ' | Fieldwork</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"/>' +
    '<script src="/theme.js"></script><link rel="stylesheet" href="/tokens.css"/><link rel="stylesheet" href="/styles.css"/><link rel="stylesheet" href="/theme.css"/>' +
    '<link rel="stylesheet" href="/shop.css"/>' + (labControls ? '<link rel="stylesheet" href="/lab.css"/>' : '') + '<link rel="stylesheet" href="/glass.css"/><link rel="stylesheet" href="/blue.css"/>' +
    '<script src="/app.js" defer></script>' + (labControls ? '<script src="/lab.js" defer></script><script src="/guide.js" defer></script>' : '') + '</head>' +
    '<body class="' + e(bodyClass) + (labControls ? ' has-lab' : '') + '">' + body +
    '<div class="cart-toast" id="cart-toast" role="status" aria-live="polite" hidden><span class="toast-check">&#10003;</span><span id="cart-toast-text"></span>' +
    '<a href="/cart">View cart &rarr;</a></div></body></html>';
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
  const navigation = [["products", "Products"], ["offers", "Offers"], ["cart", "Cart"], ["checkout", "Checkout"], ["orders", "Orders"], ["admin", "Admin"]]
    .filter(([key]) => key !== "admin" || user?.role === "admin")
    .map(([key, label]) => '<a class="nav-link ' + (key === active ? "active" : "") + '" href="/' + key + '" aria-label="' + label + '" title="' + label + '"' +
      (key === active ? ' aria-current="page"' : "") + '>' + icon(key === "cart" ? "checkout" : key) + '<span class="nav-text">' + label + '</span>' +
      (key === "cart" ? '<span class="nav-count" data-cart-count aria-hidden="true">' + cart.count + '</span>' : "") + '</a>').join("");
  const accountAction = user
    ? '<form method="post" action="/logout"><button class="signout" type="submit" aria-label="Sign out">' + icon("logout") + '<span>Sign out</span></button></form>'
    : '<a class="signout" href="/login">' + icon("logout") + '<span>Sign in</span></a>';
  const profile = '<details class="profile-menu"><summary class="avatar" role="button" aria-label="Open profile menu" title="' + e(user?.name || "Browsing as a guest") + '">' +
    e(user ? user.name.split(" ").map(part => part[0]).join("") : "?") + '</summary><div class="profile-panel">' +
    '<strong>' + e(user?.name || "Welcome to Fieldwork") + '</strong><span>' + e(user ? roleName(user.role) : "Browsing as a guest") + '</span>' +
    '<a href="/cart">' + icon("checkout") + 'View cart</a>' + (user ? '<a href="/orders">' + icon("orders") + 'My orders</a>' +
    '<form method="post" action="/logout"><button type="submit">' + icon("logout") + 'Log out</button></form>' :
    '<a href="/login">' + icon("logout") + 'Sign in to your account</a>') + '</div></details>';
  return document(title,
    '<div class="app-shell"><aside class="sidebar"><a class="brand" href="/products" aria-label="Fieldwork home">' + logo() + '</a>' +
    '<button type="button" class="sidebar-toggle icon-button" data-sidebar-toggle aria-label="Collapse sidebar" aria-expanded="true" aria-controls="main-navigation">' +
    '<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-11-3 3 3 3"/></svg></button>' +
    '<p class="nav-label">YOUR WORKSPACE</p><nav id="main-navigation" aria-label="Main navigation">' + navigation + '</nav>' +
    '<div class="sidebar-footer"><div class="demo-note"><span class="status-dot"></span><span>Demo storefront</span></div>' +
    '<p>A small shop. A little inspiration.</p>' + accountAction + '</div></aside>' +
    '<div class="workspace"><header class="topbar"><div class="breadcrumb"><a href="/products">Fieldwork</a><span>/</span><strong>' + e(title) + '</strong></div>' +
    '<div class="account-bar"><a class="header-cart" href="/cart" aria-label="Open cart">' + icon("checkout") + '<span data-cart-count>' + cart.count + '</span></a>' + themeButton() +
    '<span class="role-badge">' + e(user ? roleName(user.role) : "Guest") + '</span><div class="credit"><span>Demo credit</span><strong>' +
    (balance === null ? '&mdash;' : money(balance)) + '</strong></div>' + profile + '</div></header>' +
    (labControls ? labTools() : '') + '<main id="main-content" class="main">' + bugBanners(bugs) + body + '</main>' +
    '<footer class="page-footer"><span>Fieldwork &copy; 2026</span><span>Demo purchases only &middot; ' +
    e(now.toISOString().slice(0, 10)) + ' UTC</span></footer></div></div>' + (labControls ? labDialogs() : ''), "", labControls);
}
export function loginPage(error = "", email = "", bugs = {}, labControls = false, next = "/products") {
  const accounts = [["customer", "Customer"], ["owner", "Store Owner"], ["admin", "Admin"]];
  return document("Sign in",
    '<div class="login-tools"><a class="lab-return" href="/products">Back to shop</a>' + themeButton() + '</div>' + (labControls ? labTools() : '') +
    '<main id="main-content" class="login-layout"><section class="login-story"><a class="brand" href="/login">' + logo() + '</a>' +
    '<div class="story-copy"><span class="eyebrow light">A LITTLE MORE INTENTIONAL</span><h1>Good things.<br/>For your everyday.</h1>' +
    '<p>A considered collection for work, home, and the moments in between.</p><div class="story-art story-photo">' +
    collectionPhoto("(max-width: 560px) 90vw, 45vw") + '</div></div><p class="story-footer">Thoughtfully simple, from start to checkout.</p></section>' +
    '<section class="login-form-section"><div class="login-card"><span class="eyebrow">WELCOME TO FIELDWORK</span><h2>Make yourself at home.</h2>' +
    '<p class="muted">Sign in to explore the collection.</p>' + bugBanners(bugs) +
    (error ? '<div class="alert error" role="alert">' + e(error) + '</div>' : "") +
    '<form method="post" action="/login" class="login-form"><input type="hidden" name="next" value="' + e(next) + '"/><label for="email">Email address</label>' +
    '<input id="email" name="email" type="email" autocomplete="username" required maxlength="254" value="' + e(email) + '" placeholder="customer@example.test"/>' +
    '<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"/>' +
    '<button class="button primary full" type="submit">Sign in ' + icon("arrow") + '</button></form>' +
    '<div class="demo-accounts"><span class="eyebrow">TRY A DEMO ACCOUNT</span><p>Choose a role to fill in its sign-in details.</p><div class="role-options">' +
    accounts.map(([key, name]) => '<button type="button" class="role-choice" data-demo-role="' + key + '">' + name + '</button>').join("") +
    '</div><p class="login-disclaimer">Fictional accounts and purchases. No payment information needed.</p></div>' +
    '<p class="summary-note" style="text-align:left;margin-top:18px">New here? <a href="/signup" style="color:var(--accent);font-weight:600">Request access</a></p>' +
    '</div></section></main>' + (labControls ? labDialogs() : ''), "login-body", labControls);
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

export function productsPage(products, query = "", category = "") {
  const categories = ["Stationery", "Audio", "Home", "Lighting"];
  return '<section class="store-hero"><div class="hero-copy"><span class="eyebrow"><i class="live-spark"></i> A LITTLE EVERYDAY GOOD</span>' +
    '<h1>Small finds.<br/><em>Good everyday.</em></h1><p>Useful things. Thoughtful details. Pick your favourites and make a little room for something good.</p>' +
    '<div class="hero-actions"><a class="button primary" href="#collection">Explore the collection ' + icon("arrow") +
    '</a><a class="text-link" href="/offers">The weekend edit</a></div><span class="hero-note">A working shop inside the Release Verification Lab</span></div>' +
    '<div class="hero-scene hero-photo-scene"><div class="hero-photo">' + collectionPhoto("(max-width: 560px) 90vw, 45vw") +
    '<span class="floating-label label-demo"><span class="status-dot"></span> Real shopping. Demo credit.</span></div>' +
    '<span class="orbit-dot dot-one"></span><span class="orbit-dot dot-two"></span></div></section>' +
    '<div class="store-ribbon" aria-hidden="true"><div>' + Array(2).fill('<span>Thoughtful finds</span><i>&#10022;</i><span>Build your own basket</span><i>&#10022;</i>' +
    '<span>Try a bug. See the evidence.</span><i>&#10022;</i><span>No real payments</span><i>&#10022;</i>').join("") + '</div></div>' +
    '<section id="collection"><div class="section-toolbar"><div><span class="eyebrow">THE COLLECTION</span><h2>Shop the essentials</h2></div>' +
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
    '" data-cart-form data-cart-reload data-cart-api="/api/cart/items/' + line.product.id + '"><label class="sr-only" for="cart-quantity-' + line.product.id + '">Quantity for ' + e(line.product.name) +
    '</label><div class="quantity-control"><button type="button" data-quantity-step="-1" data-auto-submit aria-label="Decrease ' + e(line.product.name) + ' quantity"' + (line.quantity === 1 ? ' disabled' : '') +
    '>&minus;</button><input id="cart-quantity-' + line.product.id + '" type="number" name="quantity" min="1" max="' + (line.offer ? '1' : '99') + '" value="' + line.quantity +
    '" required/><button type="button" data-quantity-step="1" data-auto-submit aria-label="Increase ' + e(line.product.name) + ' quantity"' + (line.offer || line.quantity === 99 ? ' disabled' : '') +
    '>+</button></div><button type="submit" class="subtle-button">Update</button></form><form method="post" action="/cart/remove/' + line.product.id +
    '" data-cart-form data-cart-reload data-cart-method="DELETE" data-cart-api="/api/cart/items/' + line.product.id + '">' +
    '<button type="submit" class="subtle-button" aria-label="Remove ' + e(line.product.name) + '">Remove</button></form></div></div><strong class="cart-line-total">' +
    money(line.total_cents) + '</strong></article>').join("") + '<a class="text-link" href="/products">&larr; Continue exploring</a></section>' +
    '<aside class="panel order-summary"><h2>Your order, so far.</h2><dl><div><dt>Subtotal</dt><dd>' + money(cart.total_cents) + '</dd></div>' +
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
function bentoTile(iconName, label, value, { foot = "", classes = "" } = {}) {
  return '<section class="bento-tile ' + classes + '"><span class="bento-icon">' + icon(iconName) + '</span>' +
    '<span class="bento-label">' + e(label) + '</span><strong class="bento-figure">' + e(value) + '</strong>' +
    (foot ? '<span class="bento-foot">' + e(foot) + '</span>' : '') + '</section>';
}
export function adminPage(stats, orders) {
  return heading("STORE OVERVIEW", "A little perspective.", "A read-only view of this fictional store.") +
    '<div class="bento">' +
    bentoTile("check", "Recorded sales", money(stats.sales_cents), { foot: "Reconciled against the ledger", classes: "bento-hero" }) +
    bentoTile("products", "Products", stats.products) +
    bentoTile("admin", "Customers & staff", stats.users) +
    bentoTile("orders", "Completed orders", stats.orders, { classes: "bento-wide" }) +
    '</div>' +
    '<div style="margin-bottom:20px"><a class="button secondary" href="/admin/signup-requests">' + icon("admin") + ' Manage signup requests</a></div>' +
    '<section class="panel table-panel"><div class="panel-heading"><h2>All orders</h2><span class="pill neutral">Admin access</span></div>' +
    orderTable(orders, true) + '</section>';
}
export function errorPage(status, message) {
  return '<div class="empty-state"><span class="eyebrow">' + status + '</span><h1>' + e(message) +
    '</h1><a class="button secondary" href="/products">Return to products</a></div>';
}

export function signupPage(error = "", fields = {}, labControls = false) {
  const { name = "", email = "" } = fields;
  return document("Sign up",
    '<div class="login-tools"><a class="lab-return" href="/login">Back to sign in</a>' + themeButton() + '</div>' +
    '<main id="main-content" class="login-layout"><section class="login-story"><a class="brand" href="/login">' + logo() + '</a>' +
    '<div class="story-copy"><span class="eyebrow light">JOIN THE LAB</span><h1>Request access.<br/>We\'ll review it.</h1>' +
    '<p>An admin will approve your request before you can sign in. Demo credit is added automatically on approval.</p>' +
    '</div><p class="story-footer">Fictional accounts and purchases only.</p></section>' +
    '<section class="login-form-section"><div class="login-card"><span class="eyebrow">CREATE AN ACCOUNT</span><h2>Request access.</h2>' +
    '<p class="muted">Fill in your details and an admin will review your request.</p>' +
    (error ? '<div class="alert error" role="alert">' + e(error) + '</div>' : '') +
    '<form method="post" action="/signup" class="login-form">' +
    '<label for="signup-name">Full name</label>' +
    '<input id="signup-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="100" value="' + e(name) + '" placeholder="Alex Morgan"/>' +
    '<label for="signup-email">Email address</label>' +
    '<input id="signup-email" name="email" type="email" autocomplete="username" required maxlength="254" value="' + e(email) + '" placeholder="you@example.test"/>' +
    '<label for="signup-password">Password</label>' +
    '<input id="signup-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="256" placeholder="At least 8 characters"/>' +
    '<button class="button primary full" type="submit">Request access ' + icon("arrow") + '</button></form>' +
    '<p class="summary-note" style="text-align:left;margin-top:18px">Already have an account? <a href="/login" style="color:var(--accent);font-weight:600">Sign in</a></p>' +
    '</div></section></main>', "login-body", labControls);
}

export function signupPendingPage(name, labControls = false) {
  return document("Request sent",
    '<div class="login-tools"><a class="lab-return" href="/login">Back to sign in</a>' + themeButton() + '</div>' +
    '<main id="main-content" class="login-layout"><section class="login-story"><a class="brand" href="/login">' + logo() + '</a>' +
    '<div class="story-copy"><span class="eyebrow light">REQUEST SUBMITTED</span><h1>You\'re on the list.</h1>' +
    '<p>An admin will review your request and approve or reject it. You\'ll be able to sign in once approved.</p></div></section>' +
    '<section class="login-form-section"><div class="login-card" style="text-align:center;padding:40px 30px;">' +
    '<span style="font-size:48px">&#9993;</span><h2 style="margin:16px 0 10px;">Request received</h2>' +
    '<p class="muted">Thanks, ' + e(name) + '. Your signup request has been sent to an admin for review.</p>' +
    '<p class="muted" style="margin-top:12px">Once approved, sign in with the email and password you chose.</p>' +
    '<a class="button secondary" href="/login" style="margin-top:24px;display:inline-flex">Back to sign in ' + icon("arrow") + '</a>' +
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

import { labDialogs, labTools } from "./lab-view.js";
