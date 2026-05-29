import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaRls: PrismaClient | undefined;
}

const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

/**
 * Base client — connects with the privileged role (DATABASE_URL). Used for
 * cross-tenant work that must not be constrained by row-level security:
 * authentication/session resolution, tenant onboarding, invitation acceptance,
 * WhatsApp inbound routing, and the cron jobs.
 */
export const prisma = global.prisma ?? new PrismaClient({ log: [...log] });

/**
 * Optional least-privilege client — connects with the `farma_app` role via
 * DATABASE_URL_APP (NOBYPASSRLS). Only created when that env var is present, so
 * the app keeps working on the privileged connection until RLS is activated.
 */
const rlsBase = process.env.DATABASE_URL_APP
  ? global.prismaRls ??
    new PrismaClient({
      log: [...log],
      datasources: { db: { url: process.env.DATABASE_URL_APP } },
    })
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
