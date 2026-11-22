# Nido

**Your personal wealth dashboard** — stocks, ETFs, funds, crypto and interest-bearing cash, with monthly plans that book themselves.

<p align="center">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/License-MIT-4caf50"></a>
  <a href="#-publish-the-web-app-and-install-it-on-ipad"><img alt="Installable PWA" src="https://img.shields.io/badge/PWA-installable-7c4dff"></a>
  <a href="#-development"><img alt="No runtime dependencies" src="https://img.shields.io/badge/Runtime-HTML_%2B_CSS_%2B_JS-ff9800"></a>
  <a href="https://pages.github.com"><img alt="GitHub Pages" src="https://img.shields.io/badge/GitHub_Pages-published-22272e"></a>
  <br>
  <b>🇬🇧 English</b> · <a href="README.es.md">🇪🇸 Español</a>
</p>

> [!NOTE]
> No runtime dependencies: **a single HTML/CSS/JavaScript file**. Works on PC, iPhone and iPad, with light and dark theme. Your data lives on your device, never on third-party servers.

## ✨ Features

- 📊 **Total wealth**: allocation by asset type and evolution (1M, 3M, 6M, 1Y).
- 📈 **Charts fed by the brokers**: the evolution and sparklines of Trade Republic use its real price candles (`aggregateHistory` via the local server) and crypto uses CoinGecko history. Trading 212 exposes no price history in its API, so its positions are valued at cost until its orders are imported.
- 💸 **Buys and sells** with date, price, fee and total; average price, unrealized and realized gains.
- 🗓️ **Monthly Trade Republic plans** (read-only): amount and interval of each plan, just as in your broker.
- 🏦 **Interest-bearing cash** with APY (rate changes by date), daily interest and next-month estimate.
- 🤖 **Read-only brokers** (web version): account, positions, savings plans and cash of Trading 212 and Trade Republic. Data is stored on the device.
- ⏱️ **Auto refresh** every 5 s by default (5s / 15s / 30s / 60s / off).
- 🌗 **Theme with one tap**: sun/moon button toggles light ↔ dark.
- 🕶️ **Privacy mode**: the eye in the top bar blurs every value so no one can peek over your shoulder.
- 🏷️ **Logos by ISIN** from Wikidata (locally cached); fallback to a letter badge.
- 🗂️ **Investments by type**: All · Stocks · ETFs · Funds · Crypto · Other.

## 🚀 Getting started

1. **Try it without brokers (1 minute)**: `npm install` and `npm run serve`, open `http://localhost:3000`. Everything stays in your browser; no account or server needed.
2. **On your phone or tablet**: publish the web app to your GitHub Pages and install it as an app (see [Publish the web app](#publish-the-web-app-and-install-it-on-ipad)).
3. **Connect your brokers (optional)**: Trading 212 with Cloudflare Workers and Trade Republic with a local server (see [Connect brokers](#connect-brokers-optional)).

The web version cannot talk directly to Trading 212 or Trade Republic: the browser blocks cross-origin requests (CORS). That is why it uses a small server in your Cloudflare account (`worker/`) as a bridge. See [Connect brokers](#connect-brokers-optional).

## 📁 Structure

```
src/
  page.html            Structure and styles 
  app.js               All the logic: data, math, plans, charts, sheets, brokers
  web/
    manifest.webmanifest
    sw.js              Service worker: opens the app offline
    icons/             App icons
worker/
  precios.js           Broker server for Cloudflare Workers (Trading 212)
tr-server/
  server.mjs           Local Trade Republic server (Bun + trapi)
  package.json         Local server dependencies
wrangler.example.toml  Optional template to deploy the worker from the CLI (copy to wrangler.toml with your name)
config.json            Your broker server address (used by the web version)
config.example.json    Template: copy to config.json and set your URL
scripts/build.js       Generates docs/
test/run.js            Smoke tests with jsdom
docs/                  Generated web version (served by GitHub Pages)
```

## 🛠️ Development

Requires Node 18 or newer.

```bash
npm install        # only for the tests (jsdom)
npm run build      # generates docs/
npm test           # build + tests
npm run serve      # serves docs/ at http://localhost:3000 and, if Bun is present, also the local Trade Republic server at :8788 (Ctrl+C stops both)
```

Always edit `src/` and run `npm run build` again. Do not edit `docs/` by hand: it is overwritten.

## 🌐 Publish the web app and install it on iPad

1. On GitHub: Settings → Pages → Build and deployment → Source: "Deploy from a branch", branch `main`, folder `/docs`. Save.
2. A couple of minutes later it will be at `https://YOUR-USER.github.io/nido/`. On GitHub's free plan, Pages requires the repository to be public. The code contains no personal data: your positions stay on each device.
3. On the iPad, open that address in Safari → Share button → "Add to Home Screen". On iPadOS 26 keep "Open as web app" enabled.
4. Open it from the icon. It runs full-screen and offline.

**Tips:**
- Always use the home screen icon: what you save there is not shared with Safari.
- Your data lives on this device: do not use "Delete all my data" in Settings unless you want to start over.

## 🔌 Connect brokers (optional)

The web version can read your Trading 212 and Trade Republic accounts in **read-only** mode (no trading). For that you deploy two pieces yourself:

- **Trading 212** → a tiny server of your own on **Cloudflare Workers** (free, ~5 minutes). The browser cannot talk to Trading 212 directly (CORS) and the Worker is what holds your keys.
- **Trade Republic** → a **local server** on your PC (Bun + QR code). Its login flow uses WAF and WebSocket and cannot run from the browser.

Data is stored on the device and reused offline. If you remove the server address (Disconnect/Remove button), that data is deleted from the device.

### 1. Trading 212 (official API)

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages** → **Create** → **Create Worker**. Name it whatever you like (e.g. `nido-brokers`) and deploy it.
   *(CLI alternative: copy `wrangler.example.toml` to `wrangler.toml` with your Worker name and run `npx wrangler deploy` from the repo root. If you deploy by pasting the code in the dashboard, this file is not used).*
3. Click **Edit code**, delete the sample code, paste the contents of `worker/precios.js` and click **Deploy**.
4. In your Worker tab, open **Settings → Variables**:
   - Add the variable `ALLOWED_ORIGINS` with your comma-separated origins, e.g.:
     `https://YOUR-USER.github.io,http://localhost:3000,http://127.0.0.1:3000`
     Without it, the Worker only works from your own PC in development.
   - Under **Secrets**, add `T212_KEY` and `T212_SECRET` with your API Key and API Secret (generated in Trading 212: app/web → Settings → API Beta; only **Invest** and **ISA** accounts, not CFD or SIPP).
   - *(Recommended)* Under **Secrets**, also add `ACCESS_KEY` with a long random phrase (e.g. one generated by your password manager). The app will ask for it in its **Access key** field, and without it the Worker answers **401**: even if someone learns your Worker URL, they cannot read your account.
5. Copy the Worker address, like `https://nido-brokers.YOUR-ACCOUNT.workers.dev`. Opening it in a browser should answer `{"ok":true,"servicio":"nido-brokers"}`.
6. Tell the app where the Worker lives:
   - **For all your devices**: copy `config.example.json` to `config.json`, set your address, run `npm run build` and push. If the repository is public, that URL will be visible (harmless if you define `ACCESS_KEY`); if you prefer not to publish it, configure each device from Settings instead; or
   - **Only for this device**: in the app, Settings → Broker server → paste the address (and your **Access key**, if you defined `ACCESS_KEY`) → **Connect**.

> [!IMPORTANT]
> **Security**: the keys live as Cloudflare *secrets* (encrypted, not visible) and the browser never receives them. Treat your Worker address as **private**. With `ACCESS_KEY`, the app sends the `X-Access` header on every request and the Worker requires it; that key never leaves your device nor is it forwarded to Trading 212. If your URL has already leaked (e.g. it sits in the history of a public repository), the safest move is to **rotate the Worker**: create a new one with a different name, delete the old one and update the URL on your devices.

### 2. Trade Republic (unofficial, local server)

> [!WARNING]
> Trade Republic offers no public API. The connection uses the **QR-code flow** of its own website (unofficial) and requires a **local server on your PC**. It may break if Trade Republic changes its protocol, or it may not fit their terms of service. Use at your own risk.

1. Install [Bun](https://bun.sh) (required because the `trapi` library is TypeScript).
2. Install the dependencies:
   ```bash
   cd tr-server
   bun install
   ```
   The first time, Puppeteer downloads Chromium (~200 MB). That is normal.
3. Start the local server (together with the app, if you prefer: `npm run serve` from the root starts both and Ctrl+C stops them):
   ```bash
   bun server.mjs
   ```
   You will see `Servidor local de Trade Republic escuchando en http://localhost:8788/`.
   If you open the app from GitHub Pages instead of localhost, also start it with your allowed origin:
   ```bash
   ALLOWED_ORIGINS=https://YOUR-USER.github.io bun server.mjs
   ```
4. In the app: Settings → Trade Republic → type `http://localhost:8788` and **Save**.
5. Tap **Pair with QR**, scan the code with the Trade Republic app and confirm. The app detects the connection on its own and loads the portfolio (the fallback button remains in case the polling does not start).

The session is saved in `~/.tr_api_cookies.json` and reused on subsequent starts. The server only listens on your machine (`127.0.0.1`); to use it from another device on your network, start it with `HOST=0.0.0.0`. If you stop it, Trade Republic stops being read (Trading 212 keeps working on any device).

**Note**: reading positions also asks for the current price per ISIN (LSX exchange) to compute gain/loss. If some ISIN does not trade there, its P/L shows "—" and everything else works.

### 3. Common errors

- **"Origen no permitido"** (origin not allowed): add your domain to `ALLOWED_ORIGINS` in the Cloudflare Worker (Settings → Variables) or in the local Trade Republic server (environment variable), then redeploy/restart.
- **"Trading 212 no está configurado"**: the `T212_KEY` and `T212_SECRET` secrets are missing in the Worker.
- **"Clave de acceso incorrecta"** (wrong access key): check that the Worker's `ACCESS_KEY` secret and the **Access key** field in Settings match.
- **"El servidor local de Trade Republic no responde"**: is it running? `cd tr-server && bun server.mjs`. It only works from the PC where it runs.
- **Expired Trade Republic session**: pair again with the QR (Settings → Trade Republic).
- **429 (too many requests)**: Trading 212 rate-limits the API; wait a minute and retry.

## 🗃️ Data model

One collection per user, one document per entity:

- `settings`: exchange rates (`fx`, `fxHist`).
- `a_*` (asset): type, name, ticker, ISIN, currency, price, one year of history (`hist.t` in days since 1970, `hist.c` closes) and transactions (`txs`).
- `c_*` (cash account): APY rates by date (`rates`) and movements (`moves`).
- `p_*` (monthly plan): target, amount, fee, days of the month, start, optional end and skipped dates (`skip`).

Plan contributions use a fixed id (`pl_<plan>_<date>`), so even if the app is open on two devices at once they are never duplicated.

Interest is computed with daily compounding at the APY in force on each date. It is an estimate: every bank settles its own way.

## 📄 License

MIT (see [`LICENSE`](LICENSE)). Includes the `trapi` library (MIT) as a dependency of the local Trade Republic server.

---

<p align="center">
  Made with ❤️ to keep track of your wealth — <a href="README.es.md">Spanish version</a>
</p>