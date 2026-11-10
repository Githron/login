Always respond in English, including summaries and explanations.

## Project Notes

- **Stack**: Static SPA (vanilla HTML/CSS/JS, no build, no package.json). Google Identity Services OAuth, client-side JWT verification, PayPal links, YouTube embeds.
- **Key files**: `index.html` (login, navbar, drawer, shop, checkout modal), `styles.css` (dark hardware aesthetic, amber `#FF6B1A`), `app.js` (Google sign-in, `PRODUCTS` array, checkout flow).
- **Local dev**: `python3 -m http.server 8099 --bind 127.0.0.1` — serve from repo root.
- **Mobile-first**: viewport `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`. Sticky navbar + slide-in drawer (right) + checkout modal with lazy YouTube iframe.
- **Subagent**: `.claude/agents/ui-reviewer.md` — run `Agent({subagent_type: "ui-reviewer", prompt: "..."})` for automated UI/accessibility audits.
- **Structured memory**: `~/.claude/projects/-data-data-com-termux-files-home-Desktop-Github-Clone/memory/` — loads on session start.
