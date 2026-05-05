import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { admins } from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  console.log("Seeding admin...");
  const passwordHash = await bcrypt.hash("FAYAGE2026", 10);
  await db.insert(admins).values({
    username: "admin",
    passwordHash,
    isSuperAdmin: true,
  }).onConflictDoNothing();
  console.log("Done! Login: admin / FAYAGE2026");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
