import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool?: mysql.Pool;
  drizzle?: MySql2Database<typeof schema>;
};

function getPool(): mysql.Pool {
  if (globalForDb.pool) return globalForDb.pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Please define DATABASE_URL in your environment variables or .env file."
    );
  }
  const pool = mysql.createPool({
    uri: url,
    connectionLimit: 5,
    waitForConnections: true,
  });
  globalForDb.pool = pool;
  return pool;
}

function getDrizzle(): MySql2Database<typeof schema> {
  if (globalForDb.drizzle) return globalForDb.drizzle;
  const instance = drizzle(getPool(), { schema, mode: "default" });
  globalForDb.drizzle = instance;
  return instance;
}

// Lazy proxy so importing `db` doesn't throw during route/config analysis
// when DATABASE_URL is not yet needed.
export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_target, prop, receiver) {
    const realDb = getDrizzle();
    const value = Reflect.get(realDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});
