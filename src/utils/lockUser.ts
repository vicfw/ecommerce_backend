import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { usersTable } from "../db/schema/users";
import type { DbOrTrx } from "./inventory";

export const lockUserRow = async (trx: DbOrTrx, userId: number) => {
  const [user] = await trx
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .for("update");

  if (!user) {
    throw new HTTPException(401, { message: "User not found" });
  }

  return user;
};

export const lockUserByPhone = async (trx: DbOrTrx, phoneNumber: string) => {
  const [user] = await trx
    .select()
    .from(usersTable)
    .where(eq(usersTable.phoneNumber, phoneNumber))
    .for("update");

  return user ?? null;
};
