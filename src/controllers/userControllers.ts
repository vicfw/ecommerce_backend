import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { genToken } from "../utils";
import { HTTPException } from "hono/http-exception";
import { generateSMSCode } from "../utils/genSMSCode";
import { dateAddition } from "../utils/dateAddition";
import { User } from "@prisma/client";

export const getUsers = async (c: Context) => {
  const users = await prisma.user.findMany();

  return c.json({ users });
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
  const userExists = await prisma.user.findUnique({ where: { phoneNumber } });
  if (userExists) {
    const codeValidUntil = new Date(userExists.codeValidUntil);
    const presentTime = new Date(Date.now());

    // if (codeValidUntil > presentTime) {
    //   throw new HTTPException(400, {
    //     cause: { field: "phoneNumber" },
    //     message: "کد شما به تازگی ارسال شده است",
    //   });
    // }

    await prisma.user.update({
      where: { phoneNumber },
      data: {
        code: hashedPassword,
        codeValidUntil: dateWithExtra2Minutes,
      },
    });

    return c.json({
      success: true,
      code,
      message: "users code updated.",
    });
  }

  const user = await prisma.user.create({
    data: {
      phoneNumber,
      code: hashedPassword,
      codeValidUntil: dateWithExtra2Minutes,
    },
  });

  if (!user) {
    throw new HTTPException(500, {
      message: "Custom error message",
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

  const user = await prisma.user.findUnique({ where: { phoneNumber } });
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
//   const user = await prisma.user.findUnique({
//     where: { id },
//     include: { Address: true },
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
//       email: user.email,
//       isAdmin: user.isAdmin,
//       address: user.Address,
//     },
//     message: "User found successfully",
//   });
// };

export const updateUser = async (c: Context) => {
  const { name, lastName } = await c.req.json();
  const user = c.get("user");

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      name,
      lastName,
    },
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

  const updatedUser = await prisma.user.update({
    where: {
      phoneNumber,
    },
    data: {
      isAdmin,
    },
  });

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
    },
    message: "User found successfully",
  });
};
