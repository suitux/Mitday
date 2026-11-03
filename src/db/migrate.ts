import { config } from "dotenv";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import ws from "ws";

config({ path: [".env.local", ".env"] });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const host = new URL(url).hostname;
  const migrationsFolder = "./drizzle";
  if (host === "localhost" || host === "127.0.0.1") {
    const pool = new PgPool({ connectionString: url });
    await migratePg(drizzlePg({ client: pool }), { migrationsFolder });
    await pool.end();
  } else {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString: url });
    await migrateNeon(drizzleNeon({ client: pool }), { migrationsFolder });
    await pool.end();
  }
  console.log("Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
