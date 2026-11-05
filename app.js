// Replace this with your own Google OAuth client ID from the Google Cloud Console.
// Steps: https://console.cloud.google.com/apis/credentials -> Create OAuth 2.0 Client ID
//         -> Authorized JavaScript origins: http://localhost (and your domain)
//         -> Authorized redirect URIs: leave blank (uses the current page)
const CLIENT_ID = "289843250679-vbf6u9qj8qepc9e2cjfvg2u5gcri72ps.apps.googleusercontent.com";

const STORAGE_KEY = "welcome_user";

const loginView = document.getElementById("loginView");
const welcomeView = document.getElementById("welcomeView");
const errorEl = document.getElementById("error");
const userNameEl = document.getElementById("userName");
const avatarEl = document.getElementById("avatar");

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function showWelcome(user) {
  userNameEl.textContent = user.name || "Guest";
  avatarEl.textContent = "";
  if (user.picture) {
    const img = document.createElement("img");
    img.src = user.picture;
    img.alt = user.name || "Guest";
    avatarEl.appendChild(img);
  } else {
    avatarEl.textContent = (user.name || "?").charAt(0).toUpperCase();
  }
  loginView.hidden = true;
  welcomeView.hidden = false;
}

function logout() {
  localStorage.removeItem(STORAGE_KEY);
  // Also revoke the Google session if present.
  const google = window.google;
  if (google && google.accounts && google.accounts.id) {
    try { google.accounts.id.disableAutoPrompt(); } catch (e) {}
  }
  loginView.hidden = false;
  welcomeView.hidden = true;
  clearError();
}

function init() {
  // Attach the logout handler unconditionally. It used to live inside
  // setupGoogle(), which only runs when the Google script loads — so on a
  // restored session (welcome view shown from localStorage) the button was
  // never wired and did nothing.
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Restore a previously logged-in user.
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { showWelcome(JSON.parse(saved)); return; } catch (e) { /* ignore */ }
  }

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
  const timer = setTimeout(() => {
    timedOut = true;
    showError("Google sign-in library is taking too long to load. Check your connection and reload.");
  }, 8000);

  if (script) {
    script.addEventListener("load", () => {
      if (timedOut) return;
      clearTimeout(timer);
      if (window.google && window.google.accounts && window.google.accounts.id) {
        setupGoogle();
      } else {
        showError("Google sign-in library failed to load. Check your connection and reload.");
      }
    });
    script.addEventListener("error", () => {
      clearTimeout(timer);
      timedOut = true;
      showError("Google sign-in library failed to download. Check your connection and reload.");
    });
  } else {
    clearTimeout(timer);
    showError("Google sign-in library failed to load. Check your connection and reload.");
  }
}

// Fetch Google's public keys once and cache them for the session. Errors are
// swallowed — verification will retry at sign-in time if this fails.
function warmJwks() {
  fetchJwks().catch(() => { /* will retry on demand */ });
}

function setupGoogle() {
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredential,
    auto_select: false,
  });

  google.accounts.id.renderButton(document.getElementById("googleBtn"), {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
  });
}

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
    showError("Sign-in could not be verified. Check your connection and try again.");
  }
}

let signingIn = false;

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
  if (!res.ok) throw new Error("network");
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
  if (payload.aud !== CLIENT_ID) return null;
  if (!payload.exp || payload.exp < now) return null;
  if (payload.iat && payload.iat > now + 300) return null;

  return payload;
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}