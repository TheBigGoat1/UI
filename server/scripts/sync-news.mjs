import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const base = process.env.VITE_API_URL || "http://localhost:3001/api/v1";

async function main() {
  const response = await fetch(`${base}/news/sync`, { method: "POST" });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || `Sync failed (${response.status})`);
  }
  console.log("News synced to PostgreSQL:", json.data);
}

main().catch((error) => {
  console.error(error.message);
  console.error("Start API first: npm run server");
  process.exit(1);
});
