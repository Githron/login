// Replace this with your own Google OAuth client ID from the Google Cloud Console.
// Steps: https://console.cloud.google.com/apis/credentials -> Create OAuth 2.0 Client ID
//         -> Authorized JavaScript origins: http://localhost (and your domain)
//         -> Authorized redirect URIs: leave blank (uses the current page)
const CLIENT_ID = "289843250679-vbf6u9qj8qepc9e2cjfvg2u5gcri72ps.apps.googleusercontent.com";

const STORAGE_KEY = "welcome_user";

const dashboardScreen = document.getElementById("dashboardScreen");
const navAvatar = document.getElementById("navAvatar");
const navUserName = document.getElementById("navUserName");
const navUserEmail = document.getElementById("navUserEmail");
const drawerAvatar = document.getElementById("drawerAvatar");
const drawerUserName = document.getElementById("drawerUserName");
const drawerUserEmail = document.getElementById("drawerUserEmail");
const dashAvatar = document.getElementById("dashAvatar");
const dashUserName = document.getElementById("dashUserName");
const dashUserEmail = document.getElementById("dashUserEmail");
const productCount = document.getElementById("productCount");
const footerUser = document.getElementById("footerUser");
const pageBody = document.getElementById("pageBody");

function showError(msg) {
  const errorEl = document.getElementById("error");
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function clearError() {
  const errorEl = document.getElementById("error");
  errorEl.hidden = true;
  errorEl.textContent = "";
}

// --- Shop / Checkout ---
// Your presets. Each product has a demo (YouTube) and the gear image shown on the card.
const PRODUCTS = [
  {
    id: "gp5-modernmetal",
    name: "GP-5 Modern Metal",
    price: "PHP 499",
    description: "High-gain 5150-style modern metal preset for the Valeton GP-5.",
    demo: "https://www.youtube.com/watch?v=jss7xTVT99M",
    image: "58000_58076_1.jpg",
    payMongo: "",   // PayMongo signup is currently paused — leave blank until available
    paypal: "https://paypal.me/romelolacida1",
  },
];

const checkoutModal = document.getElementById("checkoutModal");
const checkoutTitle = document.getElementById("checkoutTitle");
const checkoutDesc = document.getElementById("checkoutDesc");
const checkoutImg = document.getElementById("checkoutImg");
const checkoutPrice = document.getElementById("checkoutPrice");
const checkoutError = document.getElementById("checkoutError");
const shopGrid = document.getElementById("shopGrid");

let currentProduct = null;

function renderShop() {
  shopGrid.innerHTML = "";
  if (productCount) productCount.textContent = `${PRODUCTS.length} preset${PRODUCTS.length === 1 ? "" : "s"}`;
  PRODUCTS.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="card-media">
        <img src="products/${p.image}" alt="${p.name}" class="prod-img" />
      </div>
      <div class="name">${p.name}</div>
      <div class="price">${p.price}</div>
      <div class="demo">
        <a href="${p.demo}" target="_blank" rel="noopener" onclick="event.stopPropagation()">▶ Demo</a>
      </div>
      <button class="buy" type="button">Get preset →</button>
    `;
    card.addEventListener("click", () => openCheckout(p));
    shopGrid.appendChild(card);
  });
}

function openCheckout(product) {
  currentProduct = product;
  checkoutTitle.textContent = product.name;
  checkoutDesc.textContent = product.description || "";
  checkoutImg.src = `products/${product.image}`;
  checkoutImg.alt = product.name;
  checkoutPrice.textContent = `${product.price} — choose payment method`;
  checkoutModal.classList.add("active");
  checkoutModal.hidden = false;
}

function closeCheckout() {
  currentProduct = null;
  checkoutError.hidden = true;
  checkoutError.textContent = "";
  checkoutModal.classList.remove("active");
  checkoutModal.hidden = true;
}

// Open a payment link in a new tab. If the product has no link configured
// (e.g. PayMongo is paused), show an in-modal message instead of opening a
// blank `about:blank` tab.
function payViaLink(url, label) {
  if (!currentProduct) return;
  if (!url) {
    checkoutError.textContent = `${label} is not available for this preset yet.`;
    checkoutError.hidden = false;
    return;
  }
  window.open(url, "_blank", "noopener");
}

function payViaPayMongo() {
  payViaLink(currentProduct?.payMongo, "PayMongo");
}

function payViaPayPal() {
  payViaLink(currentProduct?.paypal, "PayPal");
}

// Populate every place the user's name/avatar appears (navbar, drawer, header).
function renderUser(user) {
  const name = user.name || "Guest";
  const email = user.email || "";
  const initial = name.charAt(0).toUpperCase();

  function setAvatar(node) {
    node.innerHTML = "";
    if (user.picture) {
      const img = document.createElement("img");
      img.src = user.picture;
      img.alt = name;
      node.appendChild(img);
    } else {
      node.textContent = initial;
    }
  }

  setAvatar(navAvatar);
  setAvatar(drawerAvatar);
  setAvatar(dashAvatar);
  navUserName.textContent = name;
  navUserEmail.textContent = email;
  drawerUserName.textContent = name;
  drawerUserEmail.textContent = email;
  dashUserName.textContent = name;
  dashUserEmail.textContent = email;
  if (footerUser) footerUser.textContent = name;
}

function showWelcome(user) {
  renderUser(user);
  // Hide the whole login screen, not just its inner card — otherwise the
  // empty container keeps its layout space and the dashboard gets pushed off.
  const loginScreen = document.getElementById("loginScreen");
  loginScreen.hidden = true;
  dashboardScreen.hidden = false;
  // Build the shop grid now, not just on page refresh.
  renderShop();
}

function logout() {
  localStorage.removeItem(STORAGE_KEY);
  // Also revoke the Google session if present.
  const google = window.google;
  if (google && google.accounts && google.accounts.id) {
    try { google.accounts.id.disableAutoPrompt(); } catch (e) {}
  }
  closeDrawer();
  const loginScreen = document.getElementById("loginScreen");
  loginScreen.hidden = false;
  dashboardScreen.hidden = true;
  clearError();
}

// --- SPA routing ---
// The dashboard is a single-page app: nav links swap sections in place instead
// of reloading the page. The `data-route` links drive `navigate()`, and the
// hashchange event handles direct links / back-forward. Each route is a
// `<section id="...">` inside `#pageBody`; only one is visible at a time.
const ROUTES = ["shop", "gear", "about", "contact"];

function getRouteFromHash(hash) {
  if (!hash) return "shop";
  const id = hash.replace(/^#/, "");
  return ROUTES.includes(id) ? id : "shop";
}

function setActive(route) {
  document.querySelectorAll(".nav-link, .drawer-link").forEach(link => {
    const is = link.getAttribute("data-route") === route;
    link.classList.toggle("active", is);
    link.setAttribute("aria-current", is ? "page" : "false");
  });
}

function showRoute(route) {
  ROUTES.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = (id !== route);
  });
  setActive(route);
  // New pages start at the top; the shop grid is below the fold.
  const main = document.querySelector(".page-main");
  if (main) main.scrollTop = 0;
}

function navigate(hash) {
  const route = getRouteFromHash(hash);
  showRoute(route);
  // Keep the URL in sync so the route is shareable and survives back/forward.
  // Only write the hash when it actually differs — writing the same value is a
  // no-op, and it avoids re-entrant hashchange events.
  const target = "#" + route;
  if (route !== "shop" && window.location.hash !== target) {
    window.location.hash = target;
  }
}

// --- Mobile navigation drawer ---
// The drawer is driven by a single `is-open` class on the drawer and backdrop.
// `aria-hidden` is mirrored onto the drawer for screen-reader semantics.
function toggleDrawer() {
  const navDrawer = document.getElementById("navDrawer");
  const navToggle = document.getElementById("navToggle");
  const open = navDrawer.classList.contains("is-open");
  setDrawerState(!open);
  navToggle.setAttribute("aria-expanded", String(!open));
}

function setDrawerState(open) {
  const navDrawer = document.getElementById("navDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  navDrawer.classList.toggle("is-open", open);
  backdrop.classList.toggle("is-open", open);
  navDrawer.setAttribute("aria-hidden", String(!open));
  document.body.style.overflow = open ? "hidden" : "";
}

function closeDrawer() {
  setDrawerState(false);
  const navToggle = document.getElementById("navToggle");
  navToggle.setAttribute("aria-expanded", "false");
}

// Attach navigation event listeners as soon as the DOM is ready.
// These are independent of Google sign-in so the UI is functional even
// if sign-in fails or is not configured.
function attachNavigationHandlers() {
  const navToggle = document.getElementById("navToggle");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const checkoutModalEl = document.getElementById("checkoutModal");

  navToggle?.addEventListener("click", toggleDrawer);
  drawerBackdrop?.addEventListener("click", closeDrawer);
  // Clicking the drawer itself (not backdrop) closes it
  document.getElementById("navDrawer")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDrawer();
  });

  // SPA navigation: clicking a nav link swaps the visible section in place.
  document.querySelectorAll(".nav-link, .drawer-link").forEach(link => {
    link.addEventListener("click", (e) => {
      const route = link.getAttribute("data-route");
      if (!route) return;
      e.preventDefault();
      navigate("#" + route);
      closeDrawer();
    });
  });
  window.addEventListener("hashchange", () => navigate(window.location.hash));

  // Checkout modal buttons
  const payPayMongoBtn = document.getElementById("payPayMongo");
  const payPayPalBtn = document.getElementById("payPayPal");
  const closeCheckoutBtn = document.getElementById("closeCheckout");

  payPayMongoBtn?.addEventListener("click", payViaPayMongo);
  payPayPalBtn?.addEventListener("click", payViaPayPal);
  closeCheckoutBtn?.addEventListener("click", closeCheckout);

  checkoutModalEl?.addEventListener("click", (e) => {
    if (e.target === checkoutModalEl) closeCheckout();
  });

  // Logout buttons
  document.getElementById("navLogout")?.addEventListener("click", logout);
  document.getElementById("navLogoutDrawer")?.addEventListener("click", logout);

  // ESC key closes modal or drawer
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!checkoutModalEl?.hidden) closeCheckout();
    else closeDrawer();
  });
}

// Fetch Google's public keys once and cache them for the session. Errors are
// swallowed — verification will retry at sign-in time if this fails.
function warmJwks() {
  fetchJwks().catch(() => { /* will retry on demand */ });
}

function setupGoogle() {
  const googleBtn = document.getElementById("googleBtn");
  // Drop the loading placeholder once the real button is rendered.
  googleBtn.classList.remove("google-btn-loading");

  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredential,
    auto_select: false,
  });

  google.accounts.id.renderButton(googleBtn, {
    type: "standard",
    theme: "filled_black",
    size: "large",
    text: "continue_with",
    shape: "pill",
  });
}

// Declared here, before handleCredential, because that function reads it in its
// error path — a `let` below would throw a ReferenceError (temporal dead zone).
let signingIn = false;

async function handleCredential(response) {
  // Google's ID token is a JWT. Verify its signature and claims before trusting
  // any data inside it — never trust a decoded-but-unverified token.
  try {
    const payload = await verifyIdToken(response.credential);
    if (!payload) throw new Error("invalid");
    const user = {
      name: payload.name || payload.email || "Guest",
      email: payload.email || "",
      picture: payload.picture || "",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    // showWelcome() renders the shop grid itself.
    showWelcome(user);
  } catch (err) {
    // A network failure fetching Google's public keys is transient — retry
    // once before giving up. A genuine verification failure means the token
    // was bad; don't retry, just report it.
    if (err && err.message === "network" && !signingIn) {
      signingIn = true;
      try {
        await retryAfter(1500);
        const payload = await verifyIdToken(response.credential);
        if (payload) {
          const user = {
            name: payload.name || payload.email || "Guest",
            email: payload.email || "",
            picture: payload.picture || "",
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
          showWelcome(user);
          return;
        }
      } catch {
        // fall through to the generic message below
      } finally {
        signingIn = false;
      }
    }
    // Use the diagnostic version so the user sees *why* verification failed
    // (e.g. wrong client ID) instead of a vague "check your connection".
    try {
      const diag = await verifyIdTokenDiagnostic(response.credential);
      if (diag.ok) {
        // Verification actually succeeded — the failure was elsewhere.
        showError("Sign-in could not be completed. Please try again.");
      } else {
        showError(`Sign-in failed: ${diag.reason}. Check your Google Client ID in app.js.`);
      }
    } catch {
      showError("Sign-in could not be verified. Check your connection and try again.");
    }
  }
}

function retryAfter(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- ID token verification (RS256, against Google's public JWKS) ---

// From Google's OpenID discovery: https://accounts.google.com/.well-known/openid-configuration
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let cachedJwks = null;

async function fetchJwks() {
  if (cachedJwks) return cachedJwks;
  let res;
  try {
    res = await fetch(JWKS_URL);
  } catch {
    throw new Error("network");
  }
  // A non-2xx response is a server-side failure, not a transient network
  // blip — retrying it just burns the user's time.
  if (!res.ok) throw new Error("jwks_http");
  cachedJwks = await res.json();
  return cachedJwks;
}

async function verifyIdToken(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const header = decodeJsonB64(parts[0]);
  if (!header || header.alg !== "RS256") return null;

  // Google rotates keys; if the kid isn't in our cache, refetch once.
  let jwks = await fetchJwks();
  let key = (jwks.keys || []).find(k => k.kid === header.kid);
  if (!key) {
    cachedJwks = null;
    jwks = await fetchJwks();
    key = (jwks.keys || []).find(k => k.kid === header.kid);
  }
  if (!key) return null;

  const valid = await verifySignature(token, key);
  if (!valid) return null;

  const payload = decodeJsonB64(parts[1]);
  if (!payload) return null;

  // Claim checks.
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== "https://accounts.google.com") return null;
  // Google may return `aud` as a string or an array of client IDs.
  const aud = payload.aud;
  const audValid = (typeof aud === "string" && aud === CLIENT_ID) ||
                   (Array.isArray(aud) && aud.includes(CLIENT_ID));
  if (!audValid) return null;
  if (!payload.exp || payload.exp < now) return null;
  if (payload.iat && payload.iat > now + 300) return null;

  return payload;
}

// Diagnostic helper — returns a human-readable reason a token was rejected,
// or null if the token is valid. Used by the sign-in error path so the user
// gets a specific message instead of a generic "check your connection".
async function verifyIdTokenDiagnostic(token) {
  if (typeof token !== "string") return { ok: false, reason: "not a string" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: `expected 3 JWT parts, got ${parts.length}` };

  const header = decodeJsonB64(parts[0]);
  if (!header) return { ok: false, reason: "header could not be decoded" };
  if (header.alg !== "RS256") return { ok: false, reason: `unsupported alg: ${header.alg}` };

  let jwks = await fetchJwks();
  let key = (jwks.keys || []).find(k => k.kid === header.kid);
  if (!key) {
    cachedJwks = null;
    jwks = await fetchJwks();
    key = (jwks.keys || []).find(k => k.kid === header.kid);
  }
  if (!key) return { ok: false, reason: `kid ${header.kid} not in JWKS` };

  const valid = await verifySignature(token, key);
  if (!valid) return { ok: false, reason: "signature invalid" };

  const payload = decodeJsonB64(parts[1]);
  if (!payload) return { ok: false, reason: "payload could not be decoded" };

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== "https://accounts.google.com") return { ok: false, reason: `bad iss: ${payload.iss}` };
  const aud = payload.aud;
  const audValid = (typeof aud === "string" && aud === CLIENT_ID) ||
                   (Array.isArray(aud) && aud.includes(CLIENT_ID));
  if (!audValid) return { ok: false, reason: `aud mismatch: ${JSON.stringify(aud)}` };
  if (!payload.exp || payload.exp < now) return { ok: false, reason: `token expired (exp=${payload.exp})` };
  if (payload.iat && payload.iat > now + 300) return { ok: false, reason: `token issued in the future (iat=${payload.iat})` };

  return { ok: true, payload };
}

async function verifySignature(token, key) {
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = b64urlToBytes(signatureB64);

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    data
  );
}

function decodeJsonB64(b64) {
  try {
    const str = b64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(str);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function b64urlToBytes(b64) {
  const str = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  const binary = atob(str + pad);
  return new Uint8Array(binary.split("").map(c => c.charCodeAt(0)));
}

// Attach navigation handlers when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachNavigationHandlers);
} else {
  attachNavigationHandlers();
}

// --- Login / Welcome flow ---
function init() {
  // Attach the logout handlers unconditionally. They used to live inside
  // setupGoogle(), which only runs when the Google script loads — so on a
  // restored session the button was never wired and did nothing.
  const navLogout = document.getElementById("navLogout");
  const navLogoutDrawer = document.getElementById("navLogoutDrawer");
  navLogout?.addEventListener("click", logout);
  navLogoutDrawer?.addEventListener("click", logout);

  if (!CLIENT_ID || CLIENT_ID === "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE") {
    showError("Google sign-in is not configured. Add your Client ID in app.js.");
    return;
  }

  // Pre-warm the JWKS cache in the background. Google's public keys are safe
  // to fetch eagerly (they're public by design), so the signature check at
  // sign-in time is instant instead of adding a round-trip to the popup.
  warmJwks();

  // The Google script is loaded with `async`, so it may arrive after
  // DOMContentLoaded. Wait for it, and give up gracefully if it doesn't.
  if (window.google && window.google.accounts && window.google.accounts.id) {
    setupGoogle();
    return;
  }

  const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
  let timedOut = false;
  // A load event can be missed (e.g. the script was already in flight when
  // init() runs, or the event is swallowed on a restored page). Poll as a
  // backstop so the button still renders once the library lands.
  const poll = setInterval(() => {
    if (timedOut) return;
    if (window.google && window.google.accounts && window.google.accounts.id) {
      clearInterval(poll);
      clearTimeout(timer);
      setupGoogle();
    }
  }, 200);
  const timer = setTimeout(() => {
    timedOut = true;
    clearInterval(poll);
    showError("Google sign-in library is taking too long to load. Check your connection and reload.");
  }, 8000);

  if (script) {
    script.addEventListener("load", () => {
      if (timedOut) return;
      clearInterval(poll);
      clearTimeout(timer);
      if (window.google && window.google.accounts && window.google.accounts.id) {
        setupGoogle();
      } else {
        showError("Google sign-in library failed to load. Check your connection and reload.");
      }
    });
    script.addEventListener("error", () => {
      clearInterval(poll);
      clearTimeout(timer);
      timedOut = true;
      showError("Google sign-in library failed to download. Check your connection and reload.");
    });
  } else {
    clearInterval(poll);
    clearTimeout(timer);
    showError("Google sign-in library failed to load. Check your connection and reload.");
  }
}

// Restore a previously logged-in user.
const loginScreen = document.getElementById("loginScreen");
const errorEl = document.getElementById("error");

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    attachNavigationHandlers();
    // Try to restore saved user
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        showWelcome(user);
        navigate(window.location.hash || "#shop");
        return;
      } catch (e) { /* ignore */ }
    }
    init();
  });
} else {
  attachNavigationHandlers();
  // Try to restore saved user
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const user = JSON.parse(saved);
      showWelcome(user);
      navigate(window.location.hash || "#shop");
    } catch (e) { /* ignore */ }
  }
  init();
}