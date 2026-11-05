# Welcome — Google Login

A tiny static website with a "Sign in with Google" flow. Once logged in, it shows a welcome page with the user's name and avatar. No backend required.

## Files
- `index.html` — page structure
- `styles.css` — styling
- `app.js` — Google sign-in logic and welcome page

## How it works
1. The page loads Google's Identity Services library (`accounts.google.com/gsi/client`).
2. On login, Google returns an ID token (a JWT). The client decodes the JWT payload to read the user's name, email, and picture — no server needed.
3. The user is stored in `localStorage` so the welcome page persists on reload.
4. **Logout** clears the stored user and disables the Google session.

## Setup (one-time)
You need a Google OAuth 2.0 Client ID for web applications:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a project (or use an existing one).
3. Enable the **Google Identity Services** API (or "People API" is optional).
4. Create credentials → **OAuth 2.0 Client IDs** → **Web application**.
5. Set **Authorized JavaScript origins** to `http://localhost` (add your real domain later, e.g. `https://yourdomain.com`).
6. Copy the generated Client ID and paste it into `app.js` at the `CLIENT_ID` constant.

## Run it
Open `index.html` directly, or serve the folder:

```bash
cd "Github Clone"
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

> Note: Google's identity popup requires the page to be served over a real origin (http/https), not via `file://`. Using `http.server` satisfies this.