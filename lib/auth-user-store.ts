import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import type { AppRole } from "@/lib/roles";

type GoogleUserInput = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

let pool: Pool | null = null;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase.co")
      ? {
          rejectUnauthorized: false
        }
      : undefined
  });

  return pool;
}

export async function upsertAuthUser(input: GoogleUserInput) {
  if (!input.email) {
    throw new Error("Google account did not return an email address.");
  }

  const userId = `usr_${randomUUID()}`;
  const result = await getPool().query<{ id: string; role: "BUYER" | "MERCHANT" | null }>(
    `
      insert into "User" ("id", "name", "email", "image", "createdAt", "updatedAt")
      values ($1, $2, $3, $4, now(), now())
      on conflict ("email") do update set
        "name" = excluded."name",
        "image" = excluded."image",
        "updatedAt" = now()
      returning "id", "role"
    `,
    [userId, input.name ?? null, input.email, input.image ?? null]
  );

  return {
    id: result.rows[0].id,
    role: fromDatabaseRole(result.rows[0].role)
  };
}

export async function updateAuthUserRole(userId: string, role: AppRole) {
  await getPool().query(
    `
      update "User"
      set "role" = $2, "updatedAt" = now()
      where "id" = $1
    `,
    [userId, toDatabaseRole(role)]
  );
}

function toDatabaseRole(role: AppRole) {
  return role === "merchant" ? "MERCHANT" : "BUYER";
}

function fromDatabaseRole(role: "BUYER" | "MERCHANT" | null): AppRole | undefined {
  if (role === "MERCHANT") return "merchant";
  if (role === "BUYER") return "buyer";
  return undefined;
}
