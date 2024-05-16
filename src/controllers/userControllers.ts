import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { genToken } from "../utils";
import { HTTPException } from "hono/http-exception";
import { generateSMSCode } from "../utils/genSMSCode";

export const getUsers = async (c: Context) => {
  const users = await prisma.user.findMany();

  return c.json({ users });
};

export const createUser = async (c: Context) => {
  const { phoneNumber } = await c.req.json();

  // Check for existing user
  const userExists = await prisma.user.findUnique({ where: { phoneNumber } });
  if (userExists) {
    throw new HTTPException(401, {
      message: "این شماره تماس توسط فرد دیگری استفاده",
      cause: { field: "email", translationKey: "PHONE_NUMBER_ALREADY_USED" },
    });
  }

  const code = generateSMSCode();

  const hashedPassword = await Bun.password.hash(code.toString(), {
    algorithm: "bcrypt",
    cost: 4,
  });

  const now = new Date();
  const extraTwoMinutes = 2 * 60 * 1000;
  const dateWithExtra2Minutes = new Date(now.getTime() + extraTwoMinutes);

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

  // const token = await genToken(user.id.toString());

  return c.json({
    success: true,
    message: "User created successfully",
  });
};

// export const loginUser = async (c: Context) => {
//   const { email, password } = await c.req.json();

//   // Check for existing user
//   if (!email || !password) {
//     c.status(400);
//     throw new Error("Please provide an email and password");
//   }

//   const user = await prisma.user.findUnique({ where: { email } });
//   if (!user) {
//     c.status(401);
//     throw new Error("No user found with this email");
//   }

//   if (!(await Bun.password.verifySync(password, user.password, "bcrypt"))) {
//     c.status(401);
//     throw new Error("Invalid credentials");
//   } else {
//     const token = await genToken(user.id.toString());

//     return c.json({
//       success: true,
//       data: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         isAdmin: user.isAdmin,
//       },
//       token,
//       message: "User logged in successfully",
//     });
//   }
// };

// export const getUser = async (c: Context) => {
//   const id = parseInt(c.req.param("id"));
//   const user = await prisma.user.findUnique({
//     where: { id },
//     include: { Address: true },
//   });
//   console.log(user, "user");

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

// export const updateUser = async (c: Context) => {
//   const { name, email } = await c.req.json();
//   const user = c.get("user");

//   const updatedUser = await prisma.user.update({
//     where: {
//       id: user.id,
//     },
//     data: {
//       name,
//       email,
//     },
//   });

//   return c.json({
//     success: true,
//     data: updatedUser,
//     message: "User updated successfully",
//   });
// };
