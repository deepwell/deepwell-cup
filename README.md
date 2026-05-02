# NHL Playoff Picks Dashboard

React + TypeScript + Vite app designed for **Bun**. Static bracket picks live in [`src/data/predictions.json`](src/data/predictions.json). Each series pick identifies the matchup with **`matchupTeams`** (two team abbreviations; order does not matter). That matches NHL carousel data regardless of series letter (`a`, `b`, …). Live playoff structure and scores are loaded from **`api-web.nhle.com`**.

## Scripts

```bash
bun install
bun run dev
```

```bash
bun run build
```

## Configuration

| Env variable | Purpose |
|--------------|---------|
| `VITE_SEASON_ID` | Overrides default playoff season id (`20242025` is used when unset). |
| `VITE_NHL_API_BASE` | NHL JSON base URL (default `https://api-web.nhle.com/v1`). Set to `/nhle/v1` to use the Vite dev proxy if your browser blocks cross-origin requests. |

The proxy is defined in [`vite.config.ts`](vite.config.ts): requests to `/nhle/*` forward to `api-web.nhle.com`.

## Scoring

- **Series:** correct winner `15 − 2·|C − P|`; wrong winner `C + P − 8` when the series is completed (C = actual games, P = predicted games).
- **Conference / Cup preseason picks:** `2·(R − 1)` when the picked team’s deepest playoff round **R** is greater than 1, else `0`.
