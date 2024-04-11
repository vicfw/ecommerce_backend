import { Context } from "hono";

export const createProduct = async (c: Context) => { return c.json({ success: true, message: "Product created successfully" }) }