// lib/prisma.ts
import type { PrismaClient as PrismaClientType } from "@prisma/client";

// Ensure binary engine is NOT used (remove or comment out the old setting)
// if (!process.env.PRISMA_CLIENT_ENGINE_TYPE) {
//   process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";
// }

// 1. Dynamic imports for the constructor AND the adapter
const { PrismaClient: PrismaClientConstructor } =
  await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
import { Pool } from "pg";

// 2. Configure the database connection pool
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 3. Instantiate PrismaClient with the adapter
const client = new PrismaClientConstructor({
  adapter, // ✅ REQUIRED for engineType = "client"
  log:
    process.env.NODE_ENV === "development"
      ? ["error", "warn", "query"]
      : ["error"],
});

// 4. Singleton pattern with correct typing
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

export const prisma = globalForPrisma.prisma ?? client;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
