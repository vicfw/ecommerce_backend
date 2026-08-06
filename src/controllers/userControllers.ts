import { eq, count } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { genToken } from "../utils";
import { verifyUserOtp } from "../utils/verifyUserOtp";
import { dateAddition } from "../utils/dateAddition";
import { generateSMSCode } from "../utils/genSMSCode";
import { refreshUserOtp } from "../utils/refreshUserOtp";
import { paginationBuilder } from "../utils/builder/builderFunc";

const sanitizeUser = (user: typeof usersTable.$inferSelect) => ({
  id: user.id,
  phoneNumber: user.phoneNumber,
  name: user.name,
  lastName: user.lastName,
  isAdmin: user.isAdmin,
  point: user.point,
  createdAtdAt: user.createdAtdAt,
  updatedAt: user.updatedAt,
});

export const getUsers = async (c: Context) => {
  const url = c.req.query();
  const pagination = paginationBuilder(url);

  const users = await db.query.usersTable.findMany({
    limit: pagination.limit,
    offset: pagination.skip,
    orderBy: (users, { desc }) => [desc(users.id)],
  });

  const [totalResult] = await db
    .select({ count: count() })
    .from(usersTable);

  return c.json({
    success: true,
    data: users.map(sanitizeUser),
    total: totalResult.count,
    message: "Users fetched successfully",
  });
};

export const getUserById = async (c: Context) => {
  const { id } = c.req.param();

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, +id),
    with: {
      addresses: true,
    },
  });

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json({
    success: true,
    data: {
      ...sanitizeUser(user),
      addresses: user.addresses,
    },
    message: "User fetched successfully",
  });
};

export const updateUserById = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const updateData: Partial<typeof usersTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.isAdmin !== undefined) updateData.isAdmin = body.isAdmin;
  if (body.point !== undefined) updateData.point = body.point;

  const [updatedUser] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, +id))
    .returning();

  if (!updatedUser) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json({
    success: true,
    data: sanitizeUser(updatedUser),
    message: "User updated successfully",
  });
};

export const createUser = async (c: Context) => {
  const { phoneNumber } = await c.req.json();

  const userExists = await db.query.usersTable.findFirst({
    where: eq(usersTable.phoneNumber, phoneNumber),
  });

  if (userExists) {
    const code = await refreshUserOtp(phoneNumber);

    return c.json({
      success: true,
      code,
      message: "users code updated.",
    });
  }

  const code = generateSMSCode();
  const dateWithExtra2Minutes = dateAddition(2);

  const hashedPassword = await Bun.password.hash(code.toString(), {
    algorithm: "bcrypt",
    cost: 4,
  });

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
  const user = await verifyUserOtp(phoneNumber, code);

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
  const user = c.get("user");

  return c.json({
    success: true,
    data: sanitizeUser(user),
    message: "User found successfully",
  });
};
