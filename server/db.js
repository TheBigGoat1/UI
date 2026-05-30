import pg from "pg";
import "./config/env.js";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:2014@localhost:5432/insidr";

export const pool = new pg.Pool({ connectionString });

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function testConnection() {
  const result = await query("SELECT NOW() AS now");
  return result.rows[0];
}
