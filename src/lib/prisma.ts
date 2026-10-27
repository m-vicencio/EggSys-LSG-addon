import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "@prisma/client";
import * as PrismaClientPkg from "@prisma/client";
import { Pool } from "pg";

// Some Prisma client package layouts differ between versions/bundlers.
// Resolve the constructor at runtime and keep types permissive to avoid
// "no exported member 'PrismaClient'" errors during type-checking.
const PrismaClientCtor =
  (PrismaClientPkg as any).PrismaClient ??
  (PrismaClientPkg as any).default ??
  PrismaClientPkg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const pool =
  globalForPrisma.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new (PrismaClientCtor as any)({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
