import { eq } from "drizzle-orm";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { sendOtpSms } from "../sms";
import { dateAddition } from "./dateAddition";
import { generateSMSCode } from "./genSMSCode";

export const refreshUserOtp = async (phoneNumber: string) => {
  const code = generateSMSCode();
  const codeValidUntil = dateAddition(2);

  const hashedCode = await Bun.password.hash(code.toString(), {
    algorithm: "bcrypt",
    cost: 4,
  });

  await db
    .update(usersTable)
    .set({
      code: hashedCode,
      codeValidUntil,
    })
    .where(eq(usersTable.phoneNumber, phoneNumber));

  await sendOtpSms(phoneNumber, code);

  return code;
};
