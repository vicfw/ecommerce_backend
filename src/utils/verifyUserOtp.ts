import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { lockUserByPhone } from "./lockUser";

export const verifyUserOtp = async (phoneNumber: string, code: string) => {
  if (!code || !phoneNumber) {
    throw new HTTPException(400, {
      message: "Please provide an code and phone number",
    });
  }

  return db.transaction(async (trx) => {
    const user = await lockUserByPhone(trx, phoneNumber);

    if (!user) {
      throw new HTTPException(401, {
        message: "No user found with this phone number",
      });
    }

    const codeValidUntil = new Date(user.codeValidUntil);
    const presentTime = new Date(Date.now());

    if (isNaN(codeValidUntil.getTime())) {
      throw new HTTPException(400, {
        message: "Invalid date format",
      });
    }

    if (presentTime >= codeValidUntil) {
      throw new HTTPException(401, {
        message: "کد تایید منقضی شد",
        cause: { field: "code" },
      });
    }

    if (!(await Bun.password.verifySync(code, user.code, "bcrypt"))) {
      throw new HTTPException(401, {
        message: "کد تایید اشتباه است",
        cause: { field: "code" },
      });
    }

    await trx
      .update(usersTable)
      .set({
        code: "00000",
        codeValidUntil: new Date(0),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id));

    return user;
  });
};
