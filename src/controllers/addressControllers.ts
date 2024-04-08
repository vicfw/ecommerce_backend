import { Context } from "hono";
import { prisma } from "../config/prismaClient";

export const createAddress = async (c: Context) => {
    const body = await c.req.json()
    const user = c.get("user")

    const address = await prisma.address.create({ data: { userId: user.id, ...body } })

    if (!address) {
        c.status(400)
        throw new Error("Somthing went wrong - address didnt created")
    }

    return c.json({
        success: true,
        data: address,
        message: "Address created successfully"
    })
}