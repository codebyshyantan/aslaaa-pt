import "dotenv/config";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "../config/env.js";
import { ensureDemoUsers } from "../persistence/bootstrap.js";
import { createPostgresClient } from "../persistence/postgres-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run the bootstrap script.");
}

const sql = createPostgresClient(env.DATABASE_URL);
const migrationsDirectory = path.resolve(__dirname, "../../../../supabase/migrations");
const migrationFiles = readdirSync(migrationsDirectory)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

for (const fileName of migrationFiles) {
  const absolutePath = path.join(migrationsDirectory, fileName);
  const sqlText = readFileSync(absolutePath, "utf8");
  console.log(`Applying migration ${fileName}`);
  await sql.unsafe(sqlText);
}

await ensureDemoUsers(sql);
await sql.end({ timeout: 5 });
console.log("Bootstrap completed successfully.");
