/** NHL season id per api-web (e.g. 20242025). Override with `VITE_SEASON_ID`. */
export const PLAYOFF_SEASON_ID =
  import.meta.env.VITE_SEASON_ID ?? "20252026";

/**
 * Base URL for NHL API JSON (`https://api-web.nhle.com/v1`).
 * Defaults to the same-origin proxy so browsers never call nhle.com directly.
 */
export function getNhlApiBase(): string {
  const raw = import.meta.env.VITE_NHL_API_BASE ?? "/nhle/v1";
  return raw.replace(/\/$/, "");
}
