import crypto from "crypto";

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StoredState {
  ctx: { maxAge?: number; nonce?: string; issued?: Date };
  appState?: unknown;
  expiresAt: number;
}

const stateMap = new Map<string, StoredState>();

function pruneExpired() {
  const now = Date.now();
  for (const [handle, entry] of stateMap.entries()) {
    if (entry.expiresAt <= now) stateMap.delete(handle);
  }
}

/**
 * In-memory OIDC state store. Does not rely on session cookies, so it works
 * when the IdP redirects back cross-site and the session cookie is not sent.
 * The state handle is echoed in the callback URL, so we only need server-side storage.
 */
export const oidcStateStore = {
  store(
    _req: unknown,
    ctx: { maxAge?: number; nonce?: string; issued?: Date },
    appState: unknown,
    _meta: unknown,
    cb: (err: Error | null, handle?: string) => void,
  ) {
    const handle = crypto.randomBytes(18).toString("base64url").slice(0, 24);
    stateMap.set(handle, {
      ctx: { ...ctx },
      appState,
      expiresAt: Date.now() + TTL_MS,
    });
    if (stateMap.size > 1000) pruneExpired();
    cb(null, handle);
  },

  verify(
    _req: unknown,
    handle: string,
    cb: (
      err: Error | null,
      ctxOrFalse?:
        | { maxAge?: number | undefined; nonce?: string | undefined; issued?: Date | undefined }
        | false,
      appStateOrInfo?: unknown,
    ) => void,
  ) {
    const entry = stateMap.get(handle);
    stateMap.delete(handle);
    if (!entry) {
      return cb(null, false, { message: "Invalid authorization request state." });
    }
    if (entry.expiresAt <= Date.now()) {
      return cb(null, false, { message: "Authorization request state expired." });
    }
    const ctx = {
      maxAge: entry.ctx.maxAge,
      nonce: entry.ctx.nonce,
      issued: entry.ctx.issued,
    };
    if (typeof ctx.issued === "string") {
      ctx.issued = new Date(ctx.issued);
    }
    cb(null, ctx, entry.appState);
  },
};
