import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { sendOtpSms } from "../sms";
import { dateAddition } from "./dateAddition";
import { generateSMSCode } from "./genSMSCode";
import { lockUserByPhone } from "./lockUser";

export const refreshUserOtp = async (phoneNumber: string) => {
  const code = generateSMSCode();
  const codeValidUntil = dateAddition(2);

  const hashedCode = await Bun.password.hash(code.toString(), {
    algorithm: "bcrypt",
    cost: 4,
  });

  await db.transaction(async (trx) => {
    const user = await lockUserByPhone(trx, phoneNumber);

    if (!user) {
      throw new HTTPException(401, {
        message: "No user found with this phone number",
      });
    }

    await trx
      .update(usersTable)
      .set({
        code: hashedCode,
        codeValidUntil,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.phoneNumber, phoneNumber));
  });

  await sendOtpSms(phoneNumber, code);

  return code;
};
