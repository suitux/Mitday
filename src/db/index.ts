import "server-only";
import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

function isLocal(url: string) {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "db";
}

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (isLocal(url)) {
    // Local docker Postgres: plain TCP driver (same query builder API).
    return drizzlePg({
      client: new PgPool({ connectionString: url }),
      schema,
    }) as unknown as Db;
  }
  neonConfig.webSocketConstructor = ws;
  return drizzleNeon({
    client: new NeonPool({ connectionString: url }),
    schema,
  });
}

const globalForDb = globalThis as unknown as { __mitdayDb?: Db };

/** Lazily created so importing this module never needs DATABASE_URL. */
export function getDb(): Db {
  globalForDb.__mitdayDb ??= createDb();
  return globalForDb.__mitdayDb;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
