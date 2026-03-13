/**
 * Normalizes an Azure Communication Services connection string for EmailClient.
 * The SDK expects: endpoint=https://...;accesskey=...
 * If the user pastes only the URL and key (e.g. https://...;accesskey=...), prepend "endpoint=".
 */
export function normalizeAzureConnectionString(conn: string): string {
  const s = conn.trim();
  if (!s) return s;
  if (/^endpoint=/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return `endpoint=${s}`;
  return s;
}
