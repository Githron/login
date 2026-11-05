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
  if (user.picture) {
    avatarEl.innerHTML = `<img src="${user.picture}" alt="${user.name}" />`;
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
  // Restore a previously logged-in user.
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { showWelcome(JSON.parse(saved)); return; } catch (e) { /* ignore */ }
  }

  if (!CLIENT_ID || CLIENT_ID === "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE") {
    showError("Google sign-in is not configured. Add your Client ID in app.js.");
    return;
  }

  const google = window.google;
  if (!google || !google.accounts || !google.accounts.id) {
    showError("Google sign-in library failed to load. Check your connection.");
    return;
  }

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

  document.getElementById("logoutBtn").addEventListener("click", logout);
}

function handleCredential(response) {
  // Google's ID token is a JWT. Decode the payload client-side to get user info.
  const payload = decodeJwt(response.credential);
  if (!payload) {
    showError("Could not read sign-in response.");
    return;
  }
  const user = {
    name: payload.name || payload.email || "Guest",
    email: payload.email || "",
    picture: payload.picture || "",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  showWelcome(user);
}

function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}