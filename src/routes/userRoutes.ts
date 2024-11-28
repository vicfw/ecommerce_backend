import { Hono } from "hono";
import { user } from "../controllers";
import { isAdmin, protect } from "../middlewares";

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
users.patch("/role", isAdmin, protect, (c) => user.updateUserRole(c));

export default users;
