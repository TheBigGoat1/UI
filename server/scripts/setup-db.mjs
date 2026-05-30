import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:2014@localhost:5432/insidr";

const parsed = new URL(databaseUrl);
const dbName = parsed.pathname.replace("/", "") || "insidr";
const adminUrl = `${parsed.protocol}//${parsed.username}:${parsed.password}@${parsed.hostname}:${parsed.port || 5432}/postgres`;

const schemaPath = path.resolve(__dirname, "../../database/schema.local.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

async function main() {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();

  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    dbName,
  ]);

  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created database: ${dbName}`);
  } else {
    console.log(`Database already exists: ${dbName}`);
  }

  await admin.end();

  const appDb = new pg.Client({ connectionString: databaseUrl });
  await appDb.connect();
  await appDb.query(schemaSql);

  const migrationsDir = path.resolve(__dirname, "../../database/migrations");
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await appDb.query(sql);
      console.log(`Migration applied: ${file}`);
    }
  }

  await appDb.end();

  console.log("Schema applied successfully.");
  console.log(`Connection string: ${databaseUrl.replace(/:([^:@]+)@/, ":***@")}`);
}

main().catch((error) => {
  console.error("Database setup failed:", error.message);
  console.error("\nCheck that PostgreSQL is running and DATABASE_URL in .env is correct.");
  process.exit(1);
});
