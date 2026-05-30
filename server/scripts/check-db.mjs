import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:2014@localhost:5432/insidr";

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  const counts = {};
  for (const row of tables.rows) {
    const name = row.table_name;
    const count = await client.query(`SELECT COUNT(*)::int AS c FROM ${name}`);
    counts[name] = count.rows[0].c;
  }

  console.log("PostgreSQL connection: OK");
  console.log("Tables:", tables.rows.map((r) => r.table_name).join(", "));
  console.log("Row counts:", counts);
  await client.end();
}

main().catch((error) => {
  console.error("DB check failed:", error.message);
  process.exit(1);
});
