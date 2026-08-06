import { Hono } from "hono";
import { user } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const users = new Hono();

// Get All Users
users.get("/", protect, isAdmin, (c) => user.getUsers(c));

// Register User
users.post("/", (c) => user.createUser(c));

// Login User
users.post("/login", (c) => user.loginUser(c));

// Get User Profile
users.get("/me", protect, (c) => user.getMe(c));

// Update User Profile
users.patch("/", protect, (c) => user.updateUser(c));

// Update User Role
users.patch("/role", protect, isAdmin, (c) => user.updateUserRole(c));

// Get user by id (admin)
users.get("/:id", protect, isAdmin, (c) => user.getUserById(c));

// Update user by id (admin)
users.patch(
  "/:id",
  protect,
  isAdmin,
  zValidator("json", validation.updateUserAdminSchema),
  (c) => user.updateUserById(c)
);

export default users;
