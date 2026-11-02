import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { Pool } from "pg";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to set up the database.");
  process.exitCode = 1;
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
   ssl:
  process.env.PGSSLMODE === "disable"
    ? false
    : { rejectUnauthorized: false },
  });

  try {
    const schemaPath = fileURLToPath(new URL("../db/schema.sql", import.meta.url));
    const schema = await readFile(schemaPath, "utf8");
    await pool.query(schema);
    console.log("Database schema and starter shop data are ready.");
  } catch (error) {
    console.error("Database setup failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
