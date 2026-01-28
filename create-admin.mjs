import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { users } from "./drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

async function createAdmin() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  const email = "admin@odmen.adm";
  const password = "AHShbdb3434HShs36!@";
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await db.insert(users).values({
      email,
      passwordHash,
      name: "Admin",
      role: "admin",
    });

    console.log("✅ Admin user created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("⚠️  Admin user already exists");
    } else {
      console.error("Error creating admin user:", error);
    }
  } finally {
    await connection.end();
  }
}

createAdmin();
