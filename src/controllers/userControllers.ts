import { User } from "@prisma/client";
import { eq } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { genToken } from "../utils";
import { dateAddition } from "../utils/dateAddition";
import { generateSMSCode } from "../utils/genSMSCode";

export const getUsers = async (c: Context) => {
  const users = await db.query.usersTable.findMany();

  return c.json({
    success: true,
    data: users,
    message: "Users fetched successfully",
  });
};

export const createUser = async (c: Context) => {
  const { phoneNumber } = await c.req.json();

  const code = generateSMSCode();

  const dateWithExtra2Minutes = dateAddition(2);

  const hashedPassword = await Bun.password.hash(code.toString(), {
    algorithm: "bcrypt",
    cost: 4,
  });

  // Check for existing user
  const userExists = await db.query.usersTable.findFirst({
    where: eq(usersTable.phoneNumber, phoneNumber),
  });

  if (userExists) {
    const codeValidUntil = new Date(userExists.codeValidUntil);
    const presentTime = new Date(Date.now());

    // if (codeValidUntil > presentTime) {
    //   throw new HTTPException(400, {
    //     cause: { field: "phoneNumber" },
    //     message: "کد شما به تازگی ارسال شده است",
    //   });
    // }

    // await prisma.user.update({
    //   where: { phoneNumber },
    //   data: {
    //     code: hashedPassword,
    //     codeValidUntil: dateWithExtra2Minutes,
    //   },
    // });

    await db
      .update(usersTable)
      .set({
        code: hashedPassword,
        codeValidUntil: dateWithExtra2Minutes,
      })
      .where(eq(usersTable.phoneNumber, phoneNumber));

    return c.json({
      success: true,
      code,
      message: "users code updated.",
    });
  }

  const user = await db.insert(usersTable).values({
    phoneNumber,
    code: hashedPassword,
    codeValidUntil: dateWithExtra2Minutes,
  });

  if (!user) {
    throw new HTTPException(500, {
      message: "Something went wrong",
    });
  }

  return c.json({
    success: true,
    code,
    message: "User created successfully",
  });
};

export const loginUser = async (c: Context) => {
  const { code, phoneNumber } = await c.req.json();

  // Check for existing user
  if (!code || !phoneNumber) {
    throw new HTTPException(500, {
      message: "Please provide an code and phone number",
    });
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.phoneNumber, phoneNumber),
  });

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

  const token = await genToken(user.id.toString());

  return c.json({
    success: true,
    data: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      token,
    },

    message: "User logged in successfully",
  });
};

// export const getUser = async (c: Context) => {
//   const id = parseInt(c.req.param("id"));

//   const user = await db.query.users.findFirst({
//     where: eq(usersTable.id, id),
//   });

//   if (!user) {
//     c.status(400);
//     throw new Error("Requested user not found");
//   }

//   return c.json({
//     success: true,
//     data: {
//       id: user.id,
//       name: user.name,
//       isAdmin: user.isAdmin,
//       // address: user.Address,
//     },
//     message: "User found successfully",
//   });
// };

export const updateUser = async (c: Context) => {
  const { name, lastName } = await c.req.json();
  const user = c.get("user");

  const [updatedUser] = await db
    .update(usersTable)
    .set({
      name,
      lastName,
    })
    .where(eq(usersTable.id, user.id))
    .returning({
      phoneNumber: usersTable.phoneNumber,
      name: usersTable.name,
      lastName: usersTable.lastName,
    });

  return c.json({
    success: true,
    data: {
      phoneNumber: updatedUser.phoneNumber,
      name: updatedUser.name,
      lastName: updatedUser.lastName,
    },
    message: "User updated successfully",
  });
};

export const updateUserRole = async (c: Context) => {
  const { isAdmin, phoneNumber } = await c.req.json();

  const [updatedUser] = await db
    .update(usersTable)
    .set({ isAdmin })
    .where(eq(usersTable.phoneNumber, phoneNumber))
    .returning();

  return c.json({
    success: true,
    data: updatedUser,
    message: "User updated successfully",
  });
};

export const getMe = async (c: Context) => {
  const user: User = c.get("user");

  return c.json({
    success: true,
    data: {
      phoneNumber: user.phoneNumber,
      name: user.name,
      lastName: user.lastName,
      id: user.id,
    },
    message: "User found successfully",
  });
};
