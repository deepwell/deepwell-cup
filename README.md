# NHL Playoff Picks Dashboard

React + TypeScript + Vite app designed for **Bun**. Each series pick identifies the matchup with **`matchupTeams`** (two team abbreviations; order does not matter). That matches NHL carousel data regardless of series letter (`a`, `b`, …). Live playoff structure and scores are loaded from **`api-web.nhle.com`**.

## Scripts

```bash
bun install
bun run dev
```

```bash
bun run build
```

```bash
bun run deploy
```

## Configuration

| Env variable | Purpose |
|--------------|---------|
| `VITE_SEASON_ID` | Overrides default playoff season id (`20242025` is used when unset). |
| `VITE_NHL_API_BASE` | NHL JSON base URL (default `/nhle/v1`). The same-origin proxy avoids browser CORS failures. |

The local dev proxy is defined in [`vite.config.ts`](vite.config.ts): requests to `/nhle/*` forward to `api-web.nhle.com`.
The production Cloudflare Worker proxy lives in [`worker.js`](worker.js).

Deploy with `bun run deploy`. The Worker serves the built `dist` assets and proxies `/nhle/v1/*` before falling back to the SPA.

## Scoring

- **Series:** correct winner `15 − 2·|C − P|`; wrong winner `C + P − 8` when the series is completed (C = actual games, P = predicted games).
- **Conference / Cup preseason picks:** `2^(R − 1)` when the picked team’s deepest playoff round **R** is greater than 1, else `0`.

## Static Data

Static bracket picks live in [`src/data/predictions.json`](src/data/predictions.json).
