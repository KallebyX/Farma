import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaRls: PrismaClient | undefined;
}

const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

/**
 * Normalizes the connection string for serverless. Supabase's Vercel
 * integration often sets `connection_limit=1`, which makes the ~15 parallel
 * queries a single dashboard render fires serialize over one connection and
 * blow the 10s pool timeout (P2024) - especially with the DB cross-region from
 * the function. We raise the per-instance pool, extend the pool timeout, and
 * enable pgbouncer mode when pointing at Supabase's transaction pooler (:6543).
 * Overridable via PRISMA_CONNECTION_LIMIT.
 */
function tunePoolUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const limit = u.searchParams.get("connection_limit");
    if (!limit || limit === "1") u.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT ?? "5");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20");
    if (u.port === "6543" && !u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    return u.toString();
  } catch {
    return raw; // not a parseable URL (e.g. unset) - leave as-is
  }
}

function makeClient(url: string | undefined): PrismaClient {
  const tuned = tunePoolUrl(url);
  return tuned
    ? new PrismaClient({ log: [...log], datasources: { db: { url: tuned } } })
    : new PrismaClient({ log: [...log] });
}

/**
 * Base client - connects with the privileged role (DATABASE_URL). Used for
 * cross-tenant work that must not be constrained by row-level security:
 * authentication/session resolution, tenant onboarding, invitation acceptance,
 * WhatsApp inbound routing, and the cron jobs.
 */
export const prisma = global.prisma ?? makeClient(process.env.DATABASE_URL);

/**
 * Optional least-privilege client - connects with the `farma_app` role via
 * DATABASE_URL_APP (NOBYPASSRLS). Only created when that env var is present, so
 * the app keeps working on the privileged connection until RLS is activated.
 */
const rlsBase = process.env.DATABASE_URL_APP
  ? global.prismaRls ?? makeClient(process.env.DATABASE_URL_APP)
  : null;

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  if (rlsBase) global.prismaRls = rlsBase;
}

/**
 * Returns a Prisma client scoped to a single tenant. Every operation runs in a
 * transaction that first sets the `app.pharmacy_id` GUC, which the database's
 * RLS policies use to isolate rows.
 *
 * When DATABASE_URL_APP is not configured this falls back to the base client
 * (RLS is bypassed by the privileged role), so behaviour is unchanged until the
 * restricted connection is wired in. Use this for all tenant-scoped data access
 * inside an authenticated request; keep `prisma` for auth/cron/cross-tenant.
 */
export function tenantDb(pharmacyId: string): PrismaClient {
  if (!rlsBase) return prisma;
  const base = rlsBase;

  const extended = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        const [, result] = await base.$transaction([
          base.$executeRaw`SELECT set_config('app.pharmacy_id', ${pharmacyId}, true)`,
          query(args),
        ]);
        return result;
      },
    },
  });
  // The extended client exposes the same model delegates we use; the cast keeps
  // call sites identical to the base client.
  return extended as unknown as PrismaClient;
}
