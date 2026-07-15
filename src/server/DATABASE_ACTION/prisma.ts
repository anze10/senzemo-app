import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// --- Environment variable check ---
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// --- PostgreSQL connection pool ---

const adapter = new PrismaPg({
  connectionString,
  max: 5,
});

const logLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development"
    ? ["query", "info", "warn", "error"]
    : ["error"];

// --- Better Auth fix: ID polja prihajajo kot string v `where` filtrih ---
// Better Auth interno vedno filtrira po ID-jih kot string
// (glej https://github.com/better-auth/better-auth/issues/3450),
// naša shema pa ima User.id in Account/Session.userId kot Int. To popravi
// SAMO `where` filtre (find/update/delete) za dano polje (npr. "id" ali
// "userId"), ne dotika se `data` (tisto ureja databaseHooks v auth.ts).
function coerceWhereField(where: unknown, fieldName: string): unknown {
  if (!where || typeof where !== "object") return where;
  const result: Record<string, unknown> = {
    ...(where as Record<string, unknown>),
  };

  if (fieldName in result) {
    const v = result[fieldName];
    if (typeof v === "string") {
      result[fieldName] = parseInt(v, 10);
    } else if (v && typeof v === "object") {
      const vCopy: Record<string, unknown> = {
        ...(v as Record<string, unknown>),
      };
      for (const op of ["equals", "not"]) {
        if (typeof vCopy[op] === "string") {
          vCopy[op] = parseInt(vCopy[op] as string, 10);
        }
      }
      for (const op of ["in", "notIn"]) {
        if (Array.isArray(vCopy[op])) {
          vCopy[op] = (vCopy[op] as unknown[]).map((x) =>
            typeof x === "string" ? parseInt(x, 10) : x,
          );
        }
      }
      result[fieldName] = vCopy;
    }
  }

  for (const key of ["AND", "OR", "NOT"]) {
    if (Array.isArray(result[key])) {
      result[key] = (result[key] as unknown[]).map((w) =>
        coerceWhereField(w, fieldName),
      );
    } else if (result[key]) {
      result[key] = coerceWhereField(result[key], fieldName);
    }
  }

  return result;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: logLevels,
  }).$extends({
    query: {
      user: {
        async $allOperations({ args, query }) {
          if ("where" in args && args.where) {
            args.where = coerceWhereField(
              args.where,
              "id",
            ) as typeof args.where;
          }
          return query(args);
        },
      },
      account: {
        async $allOperations({ args, query }) {
          if ("where" in args && args.where) {
            args.where = coerceWhereField(
              args.where,
              "userId",
            ) as typeof args.where;
          }
          return query(args);
        },
      },
      session: {
        async $allOperations({ args, query }) {
          if ("where" in args && args.where) {
            args.where = coerceWhereField(
              args.where,
              "userId",
            ) as typeof args.where;
          }
          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

if (process.env.NODE_ENV === "development") {
  prisma
    .$connect()
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.error("Database connection failed:", err));
}
