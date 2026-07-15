import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logLevels: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development"
    ? ["query", "info", "warn", "error"]
    : ["error"];

function createPrismaClient(): PrismaClient {
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

  const client =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log: logLevels,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  if (process.env.NODE_ENV === "development") {
    client
      .$connect()
      .then(() => console.log("✅ Database connected successfully"))
      .catch((err) => console.error("❌ Database connection failed:", err));
  }

  return client;
}

let prismaInstance: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    return Reflect.get(client as object, prop, receiver);
  },
});
