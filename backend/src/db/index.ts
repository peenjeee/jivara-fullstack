import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.SUPABASE_POOLER_URL
  || process.env.SUPABASE_DATABASE_URL
  || process.env.DATABASE_CONNECTION_POOL_URL
  || process.env.DATABASE_POOL_URL
  || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("A database connection URL is not defined in the environment variables");
}
const maxConnections = Number(process.env.DATABASE_MAX_CONNECTIONS || 10);
const idleTimeoutSeconds = Number(process.env.DATABASE_IDLE_TIMEOUT_SECONDS || 20);
const maxLifetimeSeconds = Number(process.env.DATABASE_MAX_LIFETIME_SECONDS || 1_800);
const connectTimeoutSeconds = Number(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS || 10);

// Supabase Supavisor transaction pooler tidak mendukung prepared statements.
const client = postgres(databaseUrl, {
  max: Number.isFinite(maxConnections) ? maxConnections : 10,
  idle_timeout: Number.isFinite(idleTimeoutSeconds) ? idleTimeoutSeconds : 20,
  max_lifetime: Number.isFinite(maxLifetimeSeconds) ? maxLifetimeSeconds : 1_800,
  connect_timeout: Number.isFinite(connectTimeoutSeconds) ? connectTimeoutSeconds : 10,
  prepare: false,
});
export const db = drizzle(client, { schema });
