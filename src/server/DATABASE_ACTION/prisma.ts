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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development"
    ? ["query", "info", "warn", "error"]
    : ["error"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: logLevels,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

if (process.env.NODE_ENV === "development") {
  prisma
    .$connect()
    .then(() => console.log("✅ Database connected successfully"))
    .catch((err) => console.error("❌ Database connection failed:", err));
}
