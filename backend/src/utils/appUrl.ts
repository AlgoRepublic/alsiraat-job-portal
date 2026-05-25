/**
 * SPA origin for email / notification links.
 * FE_VITE_API_URL is the same value as the frontend VITE_API_URL (e.g. https://host/api).
 * Strip a trailing /api segment to get the site origin used with HashRouter.
 */
function resolveFrontendBase(): string {
  const raw = (
    process.env.FE_VITE_API_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  return raw.replace(/\/api$/i, "");
}

/** Base URL without trailing slash. */
export const FRONTEND_BASE = resolveFrontendBase();

/**
 * Build an absolute URL for a HashRouter route.
 * @example appUrl("/jobs") → "https://tasker.example.com/#/jobs"
 */
export function appUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${FRONTEND_BASE}/#${normalized}`;
}
