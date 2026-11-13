import { and, eq, ne } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { sendOtpSms } from "../sms";
import { dateAddition } from "./dateAddition";
import { generateSMSCode } from "./genSMSCode";
import { isUniqueViolation } from "./isUniqueViolation";
import { lockUserRow } from "./lockUser";

const otpPayload = (phoneNumber: string, code: string) =>
  `${phoneNumber}:${code}`;

const clearPendingPhone = {
  pendingPhone: null,
  pendingPhoneCode: null,
  pendingPhoneCodeValidUntil: null,
};

export const requestChangePhoneOtp = async (
  userId: number,
  currentPhoneNumber: string,
  newPhoneNumber: string
) => {
  if (newPhoneNumber === currentPhoneNumber) {
    throw new HTTPException(400, {
      message: "شماره جدید نمی‌تواند با شماره فعلی یکسان باشد",
      cause: { field: "phoneNumber" },
    });
  }

  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.phoneNumber, newPhoneNumber),
    columns: { id: true },
  });

  if (existing) {
    throw new HTTPException(409, {
      message: "این شماره قبلا ثبت شده است",
      cause: { field: "phoneNumber" },
    });
  }

  const code = generateSMSCode();
  const pendingPhoneCodeValidUntil = dateAddition(2);
  const hashedCode = await Bun.password.hash(otpPayload(newPhoneNumber, code), {
    algorithm: "bcrypt",
    cost: 4,
  });

  await db.transaction(async (trx) => {
    await lockUserRow(trx, userId);

    await trx
      .update(usersTable)
      .set({
        pendingPhone: newPhoneNumber,
        pendingPhoneCode: hashedCode,
        pendingPhoneCodeValidUntil,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId));
  });

  await sendOtpSms(newPhoneNumber, code);

  return code;
};

export const verifyChangePhoneOtp = async (
  userId: number,
  currentPhoneNumber: string,
  newPhoneNumber: string,
  code: string
) => {
  if (!code || !newPhoneNumber) {
    throw new HTTPException(400, {
      message: "Please provide an code and phone number",
    });
  }

  if (newPhoneNumber === currentPhoneNumber) {
    throw new HTTPException(400, {
      message: "شماره جدید نمی‌تواند با شماره فعلی یکسان باشد",
      cause: { field: "phoneNumber" },
    });
  }

  try {
    return await db.transaction(async (trx) => {
      await lockUserRow(trx, userId);

      const [user] = await trx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");

      if (!user) {
        throw new HTTPException(401, { message: "User not found" });
      }

      if (
        !user.pendingPhone ||
        !user.pendingPhoneCode ||
        !user.pendingPhoneCodeValidUntil
      ) {
        throw new HTTPException(401, {
          message: "کد تایید اشتباه است",
          cause: { field: "code" },
        });
      }

      if (user.pendingPhone !== newPhoneNumber) {
        throw new HTTPException(400, {
          message: "شماره با درخواست کد مطابقت ندارد",
          cause: { field: "phoneNumber" },
        });
      }

      const codeValidUntil = new Date(user.pendingPhoneCodeValidUntil);
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

      if (
        !(await Bun.password.verifySync(
          otpPayload(newPhoneNumber, code),
          user.pendingPhoneCode,
          "bcrypt"
        ))
      ) {
        throw new HTTPException(401, {
          message: "کد تایید اشتباه است",
          cause: { field: "code" },
        });
      }

      const [taken] = await trx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.phoneNumber, newPhoneNumber),
            ne(usersTable.id, userId)
          )
        )
        .for("update");

      if (taken) {
        throw new HTTPException(409, {
          message: "این شماره قبلا ثبت شده است",
          cause: { field: "phoneNumber" },
        });
      }

      const [updatedUser] = await trx
        .update(usersTable)
        .set({
          phoneNumber: newPhoneNumber,
          ...clearPendingPhone,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, userId))
        .returning();

      return updatedUser;
    });
  } catch (error) {
    if (error instanceof HTTPException || !isUniqueViolation(error)) {
      throw error;
    }

    throw new HTTPException(409, {
      message: "این شماره قبلا ثبت شده است",
      cause: { field: "phoneNumber" },
    });
  }
};
